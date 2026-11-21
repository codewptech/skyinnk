import test from 'node:test';
import assert from 'node:assert/strict';
import { plan } from '../scripts/sdc-role-orchestrator.mjs';
const SHA='a'.repeat(40), HEAD='b'.repeat(40);
function task(n,role='Chat 03',state='PR_OPEN'){
  return {number:n,state:'open',body:'Workstream: '+role+'\n### Execution state\n'+state+'\n'};
}
function pr(n,taskNum,head=HEAD,draft=false){
  return {number:n,state:'open',draft,body:'Task issue: #'+taskNum+'\n',head:{sha:head}};
}
function run(opts={}){
  return plan({issues:[task(2)],prs:[],developmentSha:SHA,...opts});
}
test('controller has six SDC roles plus separate steward, never a coding worker',()=>{
  const x=run();
  assert.deepEqual(Object.keys(x.roles),['SDC 01','SDC 02','SDC 03','SDC 04','SDC 05','SDC 06','Steward']);
  assert.equal(x.summary.actualAgentRunsStarted,0);
  assert.equal(x.summary.automaticMerges,0);
  assert.equal(x.status,'ROUTING_ONLY_NO_AGENT_DISPATCH');
});
test('missing independent exact-head review is assigned to existing SDC 03',()=>{
  const x=run({issues:[task(12)],prs:[pr(14,12)]});
  const a=x.assignments.find(p=>p.pr===14);
  assert.equal(a.role,'SDC 03');
  assert.equal(a.kind,'INDEPENDENT_REVIEW');
  assert.equal(a.head,HEAD);
  assert.equal(a.dispatchStatus,'BLOCKED_NO_VERIFIED_CHAT_TRIGGER');
});
test('old review on different head is not sufficient',()=>{
  const x=run({issues:[task(12)],prs:[pr(14,12)],reviewsByPr:{14:[{headSha:'c'.repeat(40),verdict:'ACCEPTED',independent:true}]}});
  assert.equal(x.assignments.find(p=>p.pr===14).kind,'INDEPENDENT_REVIEW');
});
test('review correction goes to the existing owner, not standalone repair agent',()=>{
  const x=run({issues:[task(35,'Work')],prs:[pr(56,35)],reviewsByPr:{56:[{headSha:HEAD,verdict:'CHANGES_REQUESTED',independent:true}]}});
  const a=x.assignments.find(p=>p.pr===56);
  assert.equal(a.role,'SDC 02');
  assert.equal(a.kind,'REVIEW_CORRECTION');
  assert.equal(a.priority,0);
});
test('no automatic merge or integration based on unverified CI',()=>{
  const x=run({issues:[task(12)],prs:[pr(14,12)],reviewsByPr:{14:[{headSha:HEAD,verdict:'ACCEPTED',independent:true}]}});
  assert.equal(x.assignments.some(a=>a.role==='SDC 06'),false);
  assert.match(x.blockers.join(' '),/CI not verified/);
});
test('when review and CI are independently proven, only a gate assignment is created',()=>{
  const x=run({issues:[task(12)],prs:[pr(14,12)],reviewsByPr:{14:[{headSha:HEAD,verdict:'ACCEPTED',independent:true}]},checksByPr:{14:[{headSha:HEAD,name:'Development CI',conclusion:'success'}]}});
  const a=x.assignments.find(p=>p.pr===14);
  assert.equal(a.role,'SDC 06');
  assert.equal(a.kind,'INTEGRATION_GATE');
  assert.equal(a.dispatchStatus,'BLOCKED_NO_VERIFIED_CHAT_TRIGGER');
});
test('ready issues are routed to their actual role, no implementation starts',()=>{
  const x=run({issues:[task(35,'Work','READY'),task(36,'Chat 03','READY'),task(54,'Chat 01','READY')]});
  const tasks=x.assignments.filter(p=>p.kind==='ELIGIBLE_TASK');
  assert.deepEqual(tasks.map(x=>x.role).sort(),['SDC 01','SDC 02','SDC 04']);
  assert.equal(x.summary.actualAgentRunsStarted,0);
});
test('draft and closed PRs not assigned to reviewers',()=>{
  const x=run({issues:[task(12)],prs:[pr(14,12,HEAD,true),{...pr(15,12),state:'closed'}]});
  assert.equal(x.assignments.filter(x=>x.pr).length,0);
});
test('unlinked PR blocked rather than invented assignment',()=>{
  const x=run({issues:[],prs:[{number:40,state:'open',body:'',head:{sha:HEAD}}]});
  assert.match(x.blockers.join(' '),/missing linked/);
});
test('identical signal snapshots preserve idempotency keys',()=>{
  const args={issues:[task(12)],prs:[pr(14,12)]};
  assert.deepEqual(run(args).assignments.map(x=>x.idempotencyKey),run(args).assignments.map(x=>x.idempotencyKey));
});
test('rejects invalid development SHA',()=>{
  assert.throws(()=>plan({developmentSha:'unknown'}),/Verified development SHA/);
});
