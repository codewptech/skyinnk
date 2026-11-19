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
 assert.equal((await broker.heartbeat({id:first.lease.id,executorId:'agent-1',generation:1})).reason,'EXPIRED_REQUIRES_RECONCILIATION');
});
test('release requires repository reconciliation and exact executor/generation',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const first=await broker.acquire(req(1));
 const data={id:first.lease.id,executorId:'agent-1',generation:1};
 assert.equal((await broker.release(data)).reason,'REPOSITORY_RECONCILIATION_REQUIRED');
 assert.equal((await broker.release({...data,executorId:'other',repositoryReconciled:true})).reason,'STALE_OR_UNAUTHORIZED');
 assert.equal((await broker.release({...data,repositoryReconciled:true})).ok,true);
 assert.equal((await broker.acquire(req(2))).ok,true);
});
test('heartbeat moves generation forward and prevents stale release',async()=>{
 let now=1000;
 const broker=createClaimBroker({store:new InMemoryClaimStore(),clock:()=>now});
 const first=await broker.acquire(req(1));
 const renewed=await broker.heartbeat({id:first.lease.id,executorId:'agent-1',generation:1,ttlMs:3000});
 assert.equal(renewed.lease.generation,2);
 assert.equal((await broker.release({
   id:first.lease.id,executorId:'agent-1',generation:1,repositoryReconciled:true
 })).ok,false);
});
test('unsafe paths fail closed',()=>{
 assert.throws(()=>normalizedPaths(['../secret']),/Unsafe/);
 assert.throws(()=>normalizedPaths(['/private']),/Unsafe/);
 assert.throws(()=>normalizedPaths([]),/At least one/);
});
test('no running adapter means no fabricated task run',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const {lease}=await broker.acquire(req(1));
 assert.equal((await dispatchWithAdapter({adapter:null,issue:37,lease})).reason,'EXECUTOR_UNAVAILABLE');
 assert.equal((await dispatchWithAdapter({adapter:{start:async()=>({})},issue:37,lease,broker})).reason,'START_NOT_CONFIRMED');
});
test('explicit fictional adapter may return a test run ID',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const {lease}=await broker.acquire(req(1));
 const result=await dispatchWithAdapter({adapter:{start:async()=>({runId:'fictional-test-run'})},issue:37,lease,broker});
 assert.equal(result.ok,true);
});

test('dispatch cannot start without verifying current lease in claim broker',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const {lease}=await broker.acquire(req(1));
 const fake={start:async()=>({runId:'should-not-run'})};
 assert.equal((await dispatchWithAdapter({adapter:fake,issue:37,lease})).reason,'CLAIM_VERIFICATION_REQUIRED');
});
test('expired, stale and released claims cannot launch executor',async()=>{
 let now=1000,startCount=0;
 const broker=createClaimBroker({store:new InMemoryClaimStore(),clock:()=>now});
 const {lease}=await broker.acquire(req(1));
 const adapter={start:async()=>{startCount++;return {runId:'not-allowed'};}};
 now=2500;
 assert.equal((await dispatchWithAdapter({adapter,issue:37,lease,broker})).reason,'EXPIRED_REQUIRES_RECONCILIATION');
 assert.equal(startCount,0);
});
test('adapter exceptions are recorded without claiming successful start',async()=>{
 const broker=createClaimBroker({store:new InMemoryClaimStore()});
 const {lease}=await broker.acquire(req(1));
 const result=await dispatchWithAdapter({
   adapter:{start:async()=>{throw Error('runtime disconnected');}},
   issue:37,lease,broker
 });
 assert.equal(result.reason,'START_FAILED');
 assert.equal(result.ok,false);
});
