import test from 'node:test';
import assert from 'node:assert/strict';
import {
 assessPullRequests, taskNumber, touchedPaths, createReadOnlyClient, inspectRepository
} from '../scripts/parallel-review-readiness.mjs';

const DEV_SHA='a'.repeat(40), HEAD='b'.repeat(40), OTHER_HEAD='c'.repeat(40);
const REPO = {full_name: 'codewptech/skyinnk'};
const check = (head_sha = HEAD, overrides = {}) => ({
  id: 100, app: {id: 15368}, name: 'Development CI', head_sha,
  status: 'completed', conclusion: 'success', ...overrides
});
const approval = (login = 'reviewer', overrides = {}) => ({
  state: 'APPROVED', commit_id: HEAD, user: {login, type: 'User'}, ...overrides
});
const make=(number,changed=['app/a.vue'],extra={})=>({
 number,title:'PR #'+number,state:'open',draft:false,mergeable:true,user:{login:'codewptech'},
 head:{sha:number===1?HEAD:OTHER_HEAD,ref:'chat03/task-fixture',repo:REPO},
 base:{ref:'development/v1-public-launch',sha:DEV_SHA,repo:REPO},
 baseIncluded:true, taskVerified:true, dependenciesVerified:true,
 body:'Task issue: #'+(number+100), changed_files:changed.length,
 files:changed.map(filename=>({filename,status:'modified'})),
 checks:[check(number===1?HEAD:OTHER_HEAD)],
 reviews:[],...extra
});

test('parse exact task reference only',()=>{
 assert.equal(taskNumber('Task issue: #35'),35);
 assert.equal(taskNumber('see #35'),null);
 assert.equal(taskNumber('Task issue: #35\r\nTask issue: #36'),null);
 assert.equal(taskNumber('Task issue:\n#35'),null);
 assert.equal(taskNumber('Task issue: #9007199254740993'),null);
});
test('rename includes old and new paths',()=>{
 assert.deepEqual(touchedPaths([{status:'renamed',previous_filename:'app/old.vue',filename:'app/new.vue'}]),['app/new.vue','app/old.vue']);
 assert.throws(()=>touchedPaths([{status:'renamed',filename:'app/new.vue'}]),/incomplete/);
});
test('invalid paths fail closed',()=>{
 assert.throws(()=>touchedPaths([{filename:'../secrets'}]),/Unsafe/);
});
test('review absence is explicitly reported',()=>{
 const x=assessPullRequests({pullRequests:[make(1)],developmentSha:DEV_SHA});
 assert.equal(x.pendingReview,1);
 assert.deepEqual(x.pullRequests[0].reasons,['REVIEW_MISSING']);
});
test('stale check is rejected for current PR head',()=>{
 const pr=make(1,['app/a.vue'],{checks:[{name:'Development CI',head_sha:OTHER_HEAD,status:'completed',conclusion:'success'}]});
 assert.ok(assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA}).pullRequests[0].reasons.includes('CI_UNVERIFIED'));
});
test('stale base is not merge candidate',()=>{
 const pr=make(1,['app/a.vue'],{base:{ref:'development/v1-public-launch',sha:OTHER_HEAD}});
 assert.ok(assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA}).pullRequests[0].reasons.includes('BASE_STALE'));
});
test('overlapping paths of renamed files are detected',()=>{
 const first=make(1,['app/old.vue'],{files:[{status:'renamed',previous_filename:'app/old.vue',filename:'app/new.vue'}]});
 const x=assessPullRequests({pullRequests:[first,make(2,['app/new.vue'])],developmentSha:DEV_SHA});
 assert.equal(x.overlapping,2);
 assert.equal(x.pullRequests[0].reasons.includes('FILE_OVERLAP'),true);
});
test('reviewed and checked PR is only a human merge candidate',()=>{
 const pr=make(1,['app/a.vue'],{reviews:[approval('independent-reviewer')]});
 const x=assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA});
 assert.equal(x.candidates,1);
 assert.equal(x.pullRequests[0].status,'CANDIDATE_FOR_HUMAN_MERGE_CHECK');
});
test('self review does not satisfy independent review',()=>{
 const pr=make(1,['app/a.vue'],{reviews:[approval('codewptech')]});
 assert.equal(assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA}).pendingReview,1);
});
test('incomplete GitHub evidence fails closed',()=>{
 assert.throws(()=>assessPullRequests({pullRequests:[{...make(1),checks:null}],developmentSha:DEV_SHA}),/Incomplete evidence/);
});
test('client never writes and never puts token in URL',async()=>{
 const calls=[];
 const fetcher=async(url,opts)=>{calls.push([url,opts]);return {ok:true,json:async()=>[]};};
 const client=createReadOnlyClient({repository:'codewptech/skyinnk',token:'TOKEN123',apiFetch:fetcher});
 await client.collect('/pulls?state=open');
 assert.equal(calls.length,1);
 assert.equal(calls[0][1].method,'GET');
 assert.ok(!calls[0][0].includes('TOKEN123'));
 assert.equal(calls[0][1].headers.Authorization,'Bearer TOKEN123');
});
function githubFixture({pr = make(1), listEntry = {...pr, mergeable: undefined},
  issue, comparison = {status:'ahead', behind_by:0}, checkCount, updatedHead} = {}) {
  const branch = {commit:{sha:DEV_SHA}};
  const linkedIssue = {
    number:101, state:'open', body:[
      'Workstream: Chat 03', 'Branch: `chat03/task-fixture`', '',
      '### Dependencies', '- START: none', '- INTEGRATION: none', '- SOFT: #91',
      '- External approval: none', '', '### Acceptance', 'fixture'
    ].join('\n'), ...issue
  };
  let detailCalls = 0;
  return async (url, opts) => {
    assert.equal(opts.method, 'GET');
    const parsed = new URL(url);
    const path = parsed.pathname.replace('/repos/codewptech/skyinnk','');
    const payload = {
      '/branches/development/v1-public-launch':branch, '/pulls':[listEntry],
      '/pulls/1/files':pr.files, '/pulls/1/reviews':pr.reviews,
      ['/commits/'+HEAD+'/check-runs']:{total_count:checkCount ?? pr.checks.length,check_runs:pr.checks},
      ['/compare/'+DEV_SHA+'...'+HEAD]:comparison, '/issues/101':linkedIssue
    };
    if (path === '/pulls/1') {
      detailCalls++;
      return Response.json(detailCalls === 2 && updatedHead
        ? {...pr, head:{...pr.head,sha:updatedHead}} : pr);
    }
    assert.ok(Object.hasOwn(payload, path), path);
    return Response.json(payload[path]);
  };
}
const scan = options => inspectRepository({
  repository:'codewptech/skyinnk', apiFetch:githubFixture(options)
});
test('single PR details supply mergeability when list endpoint omits it', async () => {
  const result = await scan({pr:make(1,['app/a.vue'],{reviews:[approval()]})});
  assert.equal(result.total, 1);
  assert.equal(result.candidates, 1); // A SOFT reference does not block.
});
test('branch SHA in pull request metadata does not prove head contains it', async () => {
  const result = await scan({comparison:{status:'diverged', behind_by:1}});
  assert.ok(result.pullRequests[0].reasons.includes('BASE_STALE'));
});
test('an unresolved hard dependency or closed task cannot grant readiness', async () => {
  let result = await scan({issue:{body:'Workstream: Chat 03\nBranch: `chat03/task-fixture`\n' +
    '### Dependencies\n- START: none\n- INTEGRATION: #24\n- SOFT: none\n- External approval: none'}});
  assert.ok(result.pullRequests[0].reasons.includes('DEPENDENCIES_UNVERIFIED'));
  result = await scan({issue:{state:'closed'}});
  assert.ok(result.pullRequests[0].reasons.includes('TASK_ISSUE_UNVERIFIED'));
});
test('partial evidence or a moved PR head stops the scan', async () => {
  await assert.rejects(scan({checkCount:101}), /Incomplete file or check evidence/);
  await assert.rejects(scan({updatedHead:OTHER_HEAD}), /PR changed during scan/);
});

test('latest changes-requested review overrides earlier approval',()=>{
 const pr=make(1,['app/a.vue'],{reviews:[
   approval('reviewer'),
   {state:'CHANGES_REQUESTED',commit_id:HEAD,user:{login:'reviewer'}}
 ]});
 assert.equal(assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA}).pendingReview,1);
});
test('mergeability not confirmed cannot produce candidate',()=>{
 const pr=make(1,['app/a.vue'],{mergeable:null,
   reviews:[approval('reviewer')]});
 assert.equal(assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA}).candidates,0);
});


test('latest completed or pending check from the expected App is authoritative', () => {
  for (const overrides of [{status:'in_progress',conclusion:null},{conclusion:'failure'}]) {
    const pr = make(1,['app/a.vue'],{checks:[check(HEAD,{id:150,...overrides}),check()]});
    const [result] = assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA}).pullRequests;
    assert.equal(result.checkId,150);
    assert.ok(result.reasons.includes('CI_UNVERIFIED'));
  }
  const pr = make(1,['app/a.vue'],{checks:[check(HEAD,{app:{id:400}})]});
  assert.ok(assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA})
    .pullRequests[0].reasons.includes('CI_UNVERIFIED'));
});
test('another approval cannot override an outstanding changes request', () => {
  const pr = make(1,['app/a.vue'],{reviews:[
    approval(), approval('other-reviewer',{state:'CHANGES_REQUESTED'})
  ]});
  const result = assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA});
  assert.equal(result.pendingReview,0);
  assert.equal(result.candidates,0);
  assert.ok(result.pullRequests[0].reasons.includes('CHANGES_REQUESTED'));
});
