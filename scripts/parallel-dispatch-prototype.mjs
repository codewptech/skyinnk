/**
 * PEA-2 claim broker prototype, not a deployed distributed lock.
 * InMemoryClaimStore provides atomic CAS only within ONE Node.js process.
 * A real cross-agent deployment requires a durable, verified CAS adapter.
 */
import {randomUUID} from 'node:crypto';

export function normalizedPaths(paths) {
  if (!Array.isArray(paths) || !paths.length) throw new Error('At least one claimed path required');
  const out = new Set();
  for (const path of paths) {
    if (typeof path !== 'string' || !path || path.startsWith('/') ||
        path.includes('\\') || /[\x00-\x1f\x7f]/.test(path) ||
        path.split('/').some(part => part === '' || part === '.' || part === '..') ||
        path.trim() !== path) {
      throw new Error('Unsafe claim path');
    }
    out.add(path);
  }
  return [...out].sort();
}

export class InMemoryClaimStore {
  constructor() {this.revision = 0;this.state = {claims:[]};}
  async read() {return {revision:this.revision,state:structuredClone(this.state)};}
  async compareAndSwap(revision,state) {
    if (this.revision !== revision) return false;
    this.state = structuredClone(state);
    this.revision++;
    return true;
  }
}

function validateRequest(request) {
  if (!Number.isSafeInteger(request.taskId) || request.taskId <= 0) throw new Error('Invalid task');
  if (typeof request.executorId !== 'string' || !request.executorId.trim()) throw new Error('Missing executor');
  if (!/^(chat03|work|chat01)\/task-[a-z0-9-]+$/.test(request.branch || '')) throw new Error('Invalid branch');
  const paths = normalizedPaths(request.paths);
  const ttlMs = request.ttlMs ?? 15*60*1000;
  if (!Number.isInteger(ttlMs) || ttlMs < 1000 || ttlMs > 60*60*1000) throw new Error('Invalid lease TTL');
  return {paths,ttlMs};
}
function optionalPaths(paths) {return paths?.length ? normalizedPaths(paths) : [];}

export function createClaimBroker({store,clock=()=>Date.now(),maxRetries=8,verifyRelease}) {
  if (!store || typeof store.read!=='function' || typeof store.compareAndSwap!=='function') {
    throw new Error('Atomic compare-and-swap store required');
  }
  return {
    async acquire(request,{reservedPRPaths=[]}={}) {
      const {paths,ttlMs}=validateRequest(request);
      const blocked=new Set(optionalPaths(reservedPRPaths));
      if (paths.some(x=>blocked.has(x)))return {ok:false,reason:'OPEN_PR_COLLISION'};
      for(let attempt=0;attempt<maxRetries;attempt++) {
        const s=await store.read();
        if (!Array.isArray(s.state.claims))throw new Error('Corrupt claim store');
        const existing=s.state.claims.find(c=>c.taskId===request.taskId);
        if(existing) {
          if(existing.executorId===request.executorId && existing.branch===request.branch &&
             JSON.stringify(existing.paths)===JSON.stringify(paths)) {
            if (existing.state !== 'ACTIVE' || existing.expiresAt <= clock()) {
              return {ok:false, reason:'EXPIRED_REQUIRES_RECONCILIATION'};
            }
            return {ok:true,idempotent:true,lease:structuredClone(existing)};
          }
          return {ok:false,reason:'TASK_ALREADY_CLAIMED'};
        }
        if (s.state.claims.some(c => c.branch === request.branch)) {
          return {ok:false, reason:'BRANCH_ALREADY_CLAIMED'};
        }
        // Expired lease is suspect and must not free paths automatically.
        const conflict=s.state.claims.find(c=>c.paths.some(x=>paths.includes(x)));
        if(conflict)return {ok:false,reason:'PATH_COLLISION',conflictingTask:conflict.taskId};
        const now=clock();
        const lease={id:randomUUID(),taskId:request.taskId,executorId:request.executorId,
          branch:request.branch,paths,generation:1,acquiredAt:now,expiresAt:now+ttlMs,state:'ACTIVE'};
        if(await store.compareAndSwap(s.revision,{claims:[...s.state.claims,lease]})) {
          return {ok:true,lease};
        }
      }
      return {ok:false,reason:'CAS_CONTENTION_RETRY'};
    },
    async heartbeat({id,executorId,generation,ttlMs=15*60*1000}) {
      if(!Number.isInteger(ttlMs)||ttlMs<1000||ttlMs>60*60*1000)throw new Error('Invalid TTL');
      for(let attempt=0;attempt<maxRetries;attempt++) {
        const s=await store.read(),lease=s.state.claims.find(c=>c.id===id);
        if(!lease||lease.executorId!==executorId||lease.generation!==generation||
           lease.state!=='ACTIVE')return {ok:false,reason:'STALE_OR_UNAUTHORIZED'};
        if(lease.expiresAt<=clock())return {ok:false,reason:'EXPIRED_REQUIRES_RECONCILIATION'};
        const next=structuredClone(s.state);
        const found=next.claims.find(c=>c.id===id);
        found.expiresAt=clock()+ttlMs;found.generation++;
        if(await store.compareAndSwap(s.revision,next))return {ok:true,lease:found};
      }
      return {ok:false,reason:'CAS_CONTENTION_RETRY'};
    },
    async release({id,executorId,generation}) {
      if (typeof verifyRelease !== 'function') {
        return {ok:false,reason:'REPOSITORY_RECONCILIATION_REQUIRED'};
      }
      for(let attempt=0;attempt<maxRetries;attempt++) {
        const s=await store.read(),lease=s.state.claims.find(c=>c.id===id);
        if(!lease||lease.executorId!==executorId||lease.generation!==generation){
          return {ok:false,reason:'STALE_OR_UNAUTHORIZED'};
        }
        if (await verifyRelease(structuredClone(lease)) !== true) {
          return {ok:false,reason:'REPOSITORY_RECONCILIATION_REQUIRED'};
        }
        if(await store.compareAndSwap(s.revision,{claims:s.state.claims.filter(c=>c.id!==id)})){
          return {ok:true};
        }
      }
      return {ok:false,reason:'CAS_CONTENTION_RETRY'};
    },
    async verifyLease({id,executorId,generation}) {
      const s=await store.read();
      const lease=s.state.claims.find(c=>c.id===id);
      if(!lease || lease.executorId!==executorId || lease.generation!==generation ||
         lease.state!=='ACTIVE')return {ok:false,reason:'STALE_OR_UNAUTHORIZED'};
      if(lease.expiresAt<=clock())return {ok:false,reason:'EXPIRED_REQUIRES_RECONCILIATION'};
      return {ok:true,lease:structuredClone(lease)};
    },
    async reserveDispatch({id,executorId,generation,taskId}) {
      for (let attempt=0; attempt<maxRetries; attempt++) {
        const snapshot = await store.read();
        const lease = snapshot.state.claims.find(claim => claim.id === id);
        if (!lease || lease.executorId !== executorId || lease.generation !== generation ||
            lease.state !== 'ACTIVE') return {ok:false, reason:'STALE_OR_UNAUTHORIZED'};
        if (lease.taskId !== taskId) return {ok:false, reason:'TASK_LEASE_MISMATCH'};
        if (lease.expiresAt <= clock()) return {ok:false, reason:'EXPIRED_REQUIRES_RECONCILIATION'};
        if (lease.dispatch) return {ok:false, reason:'DISPATCH_ALREADY_RESERVED'};
        const reserved = {...lease, dispatch:{id:randomUUID(), state:'START_PENDING'}};
        const next = {claims:snapshot.state.claims.map(claim => claim.id === id ? reserved : claim)};
        if (await store.compareAndSwap(snapshot.revision,next)) return {ok:true, lease:reserved};
      }
      return {ok:false, reason:'CAS_CONTENTION_RETRY'};
    },
    async confirmDispatch({id,dispatchId,runId}) {
      for (let attempt=0; attempt<maxRetries; attempt++) {
        const snapshot = await store.read();
        const lease = snapshot.state.claims.find(claim => claim.id === id);
        if (lease?.dispatch?.id !== dispatchId || lease.dispatch.state !== 'START_PENDING') {
          return false;
        }
        const started = {...lease,dispatch:{id:dispatchId,state:'START_CONFIRMED',runId}};
        const next = {claims:snapshot.state.claims.map(claim => claim.id === id ? started : claim)};
        if (await store.compareAndSwap(snapshot.revision,next)) return true;
      }
      return false;
    },
    async inspect(){
      const s=await store.read();
      return s.state.claims.map(c=>({...c,
        observableStatus:c.expiresAt<=clock()?'SUSPECT_RECONCILE':'ACTIVE'}));
    }
  };
}

/** Does not wake chat sessions. Only accepts a genuine, injected execution runtime. */
export async function dispatchWithAdapter({adapter,issue,lease,broker}){
  if(!adapter||typeof adapter.start!=='function')return {ok:false,reason:'EXECUTOR_UNAVAILABLE'};
  if(!lease||lease.state!=='ACTIVE')return {ok:false,reason:'VALID_LEASE_REQUIRED'};
  if (!broker || typeof broker.reserveDispatch !== 'function' ||
      typeof broker.confirmDispatch !== 'function') {
    return {ok:false,reason:'CLAIM_VERIFICATION_REQUIRED'};
  }
  const current = await broker.reserveDispatch({
    id:lease.id, executorId:lease.executorId, generation:lease.generation, taskId:issue
  });
  if (!current.ok) return current;

  const dispatchId = current.lease.dispatch.id;
  let result;
  try {
    result = await adapter.start({issue,lease:current.lease,idempotencyKey:dispatchId});
  } catch {
    // The provider may have accepted the request before contact was lost.
    return {ok:false,reason:'START_FAILED',dispatchId};
  }
  if (!result || typeof result.runId !== 'string' || !result.runId.trim()) {
    return {ok:false,reason:'START_NOT_CONFIRMED',dispatchId};
  }
  try {
    if (await broker.confirmDispatch({id:lease.id,dispatchId,runId:result.runId})) {
      return {ok:true,runId:result.runId};
    }
  } catch {
    // Keep the pending reservation for provider-side reconciliation.
  }
  return {ok:false,reason:'START_EVIDENCE_NOT_PERSISTED',dispatchId};
}
