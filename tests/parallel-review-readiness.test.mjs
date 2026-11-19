import test from 'node:test';
import assert from 'node:assert/strict';
import {
 assessPullRequests, taskNumber, touchedPaths, createReadOnlyClient, inspectRepository
} from '../scripts/parallel-review-readiness.mjs';

const DEV_SHA='a'.repeat(40), HEAD='b'.repeat(40), OTHER_HEAD='c'.repeat(40);
const make=(number,changed=['app/a.vue'],extra={})=>({
 number,title:'PR #'+number,state:'open',draft:false,user:{login:'codewptech'},
 head:{sha:number===1?HEAD:OTHER_HEAD},
 base:{ref:'development/v1-public-launch',sha:DEV_SHA},
 body:'Task issue: #'+(number+100),
 files:changed.map(filename=>({filename,status:'modified'})),
 checks:[{name:'Development CI',head_sha:number===1?HEAD:OTHER_HEAD,status:'completed',conclusion:'success'}],
 reviews:[],...extra
});

test('parse exact task reference only',()=>{
 assert.equal(taskNumber('Task issue: #35'),35);
 assert.equal(taskNumber('see #35'),null);
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
 const pr=make(1,['app/a.vue'],{reviews:[{state:'APPROVED',commit_id:HEAD,user:{login:'independent-reviewer'}}]});
 const x=assessPullRequests({pullRequests:[pr],developmentSha:DEV_SHA});
 assert.equal(x.candidates,1);
 assert.equal(x.pullRequests[0].status,'CANDIDATE_FOR_HUMAN_MERGE_CHECK');
});
test('self review does not satisfy independent review',()=>{
 const pr=make(1,['app/a.vue'],{reviews:[{state:'APPROVED',commit_id:HEAD,user:{login:'codewptech'}}]});
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
test('live adapter supports fully fictional GitHub responses',async()=>{
 const fake=async(url,opts)=>{
   assert.equal(opts.method,'GET');
   if(url.includes('/branches/development/'))return {ok:true,json:async()=>({commit:{sha:DEV_SHA}})};
   if(url.includes('/pulls?state=open'))return {ok:true,json:async()=>[make(1)]};
   if(url.includes('/pulls/1/files'))return {ok:true,json:async()=>make(1).files};
   if(url.includes('/commits/'+HEAD+'/check-runs'))return {ok:true,json:async()=>({check_runs:make(1).checks})};
   if(url.includes('/pulls/1/reviews'))return {ok:true,json:async()=>[]};
   throw Error(url);
 };
 const x=await inspectRepository({repository:'codewptech/skyinnk',apiFetch:fake});
 assert.equal(x.total,1);
 assert.equal(x.pendingReview,1);
});
