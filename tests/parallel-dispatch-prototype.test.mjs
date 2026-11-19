import test from 'node:test';
import assert from 'node:assert/strict';
import {
 InMemoryClaimStore,createClaimBroker,dispatchWithAdapter,normalizedPaths
} from '../scripts/parallel-dispatch-prototype.mjs';

const req=(taskId,paths=['app/a.vue'])=>({
 taskId,executorId:'agent-'+taskId,
 branch:'chat03/task-demo-'+taskId,paths,ttlMs:1000
});

test('30 simultaneous overlapping CAS attempts yield exactly one winner',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const results=await Promise.all(Array.from({length:30},(_,i)=>broker.acquire(req(i+1))));
 assert.equal(results.filter(x=>x.ok).length,1);
 assert.equal((await broker.inspect()).length,1);
});
test('disjoint claims can succeed concurrently',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const results=await Promise.all([
   broker.acquire(req(1,['app/a.vue'])),
   broker.acquire(req(2,['app/b.vue']))
 ]);
 assert.equal(results.filter(x=>x.ok).length,2);
});
test('idempotent retry cannot steal a task',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const first=await broker.acquire(req(1));
 const second=await broker.acquire(req(1));
 assert.equal(second.idempotent,true);
 assert.equal(first.lease.id,second.lease.id);
 assert.equal((await broker.acquire({...req(1),executorId:'other'})).ok,false);
});
test('open PR path collision blocks before any writes',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 assert.equal((await broker.acquire(req(1),{reservedPRPaths:['app/a.vue']})).reason,'OPEN_PR_COLLISION');
 assert.deepEqual(await broker.inspect(),[]);
});
test('expired lease remains suspect and cannot be stolen',async()=>{
 let now=1000;
 const broker=createClaimBroker({store:new InMemoryClaimStore(),clock:()=>now});
 const first=await broker.acquire(req(1));
 now=2500;
 assert.equal((await broker.inspect())[0].observableStatus,'SUSPECT_RECONCILE');
 assert.equal((await broker.acquire(req(2))).reason,'PATH_COLLISION');
 assert.equal((await broker.acquire(req(1))).reason,'EXPIRED_REQUIRES_RECONCILIATION');
 assert.equal((await broker.heartbeat({id:first.lease.id,executorId:'agent-1',generation:1})).reason,'EXPIRED_REQUIRES_RECONCILIATION');
});
test('release requires repository reconciliation and exact executor/generation',async()=>{
 let safeToRelease = false;
 const broker=createClaimBroker({
   store:new InMemoryClaimStore(),verifyRelease:async () => safeToRelease
 });
 const first=await broker.acquire(req(1));
 const data={id:first.lease.id,executorId:'agent-1',generation:1};
 assert.equal((await broker.release({...data,repositoryReconciled:true})).reason,'REPOSITORY_RECONCILIATION_REQUIRED');
 safeToRelease = true;
 assert.equal((await broker.release({...data,executorId:'other'})).reason,'STALE_OR_UNAUTHORIZED');
 assert.equal((await broker.release(data)).ok,true);
 assert.equal((await broker.acquire(req(2))).ok,true);
});
test('heartbeat moves generation forward and prevents stale release',async()=>{
 let now=1000;
 const broker=createClaimBroker({store:new InMemoryClaimStore(),clock:()=>now,
   verifyRelease:async () => true});
 const first=await broker.acquire(req(1));
 const renewed=await broker.heartbeat({id:first.lease.id,executorId:'agent-1',generation:1,ttlMs:3000});
 assert.equal(renewed.lease.generation,2);
 assert.equal((await broker.release({
   id:first.lease.id,executorId:'agent-1',generation:1,repositoryReconciled:true
 })).ok,false);
});
test('unsafe paths fail closed',()=>{
 assert.throws(()=>normalizedPaths(['../secret']),/Unsafe/);
 for (const path of ['/private','app//a.vue','./app/a.vue','app/a.vue\n']) {
   assert.throws(()=>normalizedPaths([path]),/Unsafe/);
 }
 assert.throws(()=>normalizedPaths([]),/At least one/);
});
test('no running adapter means no fabricated task run',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const {lease}=await broker.acquire(req(1));
 assert.equal((await dispatchWithAdapter({adapter:null,issue:1,lease})).reason,'EXECUTOR_UNAVAILABLE');
 assert.equal((await dispatchWithAdapter({adapter:{start:async()=>({})},issue:1,lease,broker})).reason,'START_NOT_CONFIRMED');
});
test('explicit fictional adapter may return a test run ID',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const {lease}=await broker.acquire(req(1));
 const result=await dispatchWithAdapter({adapter:{start:async()=>({runId:'fictional-test-run'})},issue:1,lease,broker});
 assert.equal(result.ok,true);
});

test('dispatch cannot start without verifying current lease in claim broker',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const {lease}=await broker.acquire(req(1));
 const fake={start:async()=>({runId:'should-not-run'})};
 assert.equal((await dispatchWithAdapter({adapter:fake,issue:1,lease})).reason,'CLAIM_VERIFICATION_REQUIRED');
});
test('expired, stale and released claims cannot launch executor',async()=>{
 let now=1000,startCount=0;
 const broker=createClaimBroker({store:new InMemoryClaimStore(),clock:()=>now});
 const {lease}=await broker.acquire(req(1));
 const adapter={start:async()=>{startCount++;return {runId:'not-allowed'};}};
 now=2500;
 assert.equal((await dispatchWithAdapter({adapter,issue:1,lease,broker})).reason,'EXPIRED_REQUIRES_RECONCILIATION');
 assert.equal(startCount,0);
});
test('adapter exceptions are recorded without claiming successful start',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const {lease}=await broker.acquire(req(1));
 const result=await dispatchWithAdapter({
   adapter:{start:async()=>{throw Error('runtime disconnected');}},
   issue:1,lease,broker
 });
 assert.equal(result.reason,'START_FAILED');
 assert.equal(result.ok,false);
 assert.equal((await broker.inspect())[0].dispatch.state,'START_PENDING');
 assert.equal((await dispatchWithAdapter({
   adapter:{start:async()=>{throw Error('duplicate');}},issue:1,lease,broker
 })).reason,'DISPATCH_ALREADY_RESERVED');
});


test('disjoint paths cannot reuse another task branch', async () => {
 const broker = createClaimBroker({store:new InMemoryClaimStore()});
 const first = await broker.acquire(req(1));
 const next = await broker.acquire({...req(2,['app/b.vue']),branch:first.lease.branch});
 assert.equal(next.reason,'BRANCH_ALREADY_CLAIMED');
});

test('dispatch binds the issue to the verified lease before calling the adapter', async () => {
 const broker = createClaimBroker({store:new InMemoryClaimStore()});
 const {lease} = await broker.acquire(req(1));
 let startCalls = 0;
 const adapter = {start:async () => { startCalls++; return {runId:'fictional'}; }};
 const result = await dispatchWithAdapter({adapter,issue:2,lease,broker});
 assert.equal(result.reason,'TASK_LEASE_MISMATCH');
 assert.equal(startCalls,0);
});


test('competing dispatch requests reserve the same lease exactly once', async () => {
 const store = new InMemoryClaimStore();
 const first = createClaimBroker({store});
 const second = createClaimBroker({store});
 const {lease} = await first.acquire(req(1));
 let startCalls = 0;
 const adapter = {start:async ({idempotencyKey}) => {
   assert.match(idempotencyKey,/^[a-f0-9-]{36}$/);
   startCalls++;
   return {runId:'fictional-concurrent'};
 }};
 const results = await Promise.all([first,second].map(broker =>
   dispatchWithAdapter({adapter,issue:1,lease,broker})));
 assert.equal(results.filter(result => result.ok).length,1);
 assert.equal(startCalls,1);
 assert.equal((await second.inspect())[0].dispatch.runId,'fictional-concurrent');
});

test('an external start whose evidence cannot be persisted keeps the reservation', async () => {
 const store = new InMemoryClaimStore();
 const broker = createClaimBroker({store});
 const {lease} = await broker.acquire(req(1));
 const adapter = {start:async () => {
   const compareAndSwap = store.compareAndSwap.bind(store);
   store.compareAndSwap = async (...args) => {
     store.compareAndSwap = compareAndSwap;
     throw new Error('ledger temporarily unavailable');
   };
   return {runId:'fictional-lost-evidence'};
 }};
 const result = await dispatchWithAdapter({adapter,issue:1,lease,broker});
 assert.equal(result.reason,'START_EVIDENCE_NOT_PERSISTED');
 assert.equal((await broker.inspect())[0].dispatch.state,'START_PENDING');
});
