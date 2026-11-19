import test from 'node:test';
import assert from 'node:assert/strict';
import {ClaimLedgerError,GitHubFastForwardClaimStore} from '../scripts/github-claim-store.mjs';

// GitHub HTTP fake with real non-forced fast-forward ancestry checks.
// Live GitHub verification and executor installation are separate gates.
class FakeGitHub{
 constructor(){
  this.i=3;this.sha=n=>n.toString(16).padStart(40,'0');this.head=this.sha(1);
  this.trees=new Map([[this.sha(2),{'parallel-claims.json':JSON.stringify({claims:[]})}]]);
  this.commits=new Map([[this.head,{tree:this.sha(2),parents:[]}]]);
  this.blobs=new Map();this.patchCount=0;this.reject=false;this.noFile=false;
 }
 response(status,data={}){return {status,ok:status>=200&&status<300,json:async()=>data};}
 async fetch(url,opts){
  const path=new URL(url).pathname.replace('/repos/skyinnk/skyinnk','');
  const body=opts.body?JSON.parse(opts.body):{};
  if(path==='/git/ref/heads/ops/parallel-claims'&&opts.method==='GET')
   return this.response(200,{object:{type:'commit',sha:this.head}});
  if(path==='/contents/parallel-claims.json'&&opts.method==='GET'){
   if(this.noFile)return this.response(404);
   const revision=new URL(url).searchParams.get('ref');
   const content=this.trees.get(this.commits.get(revision)?.tree)?.['parallel-claims.json'];
   return content===undefined?this.response(404):this.response(200,{type:'file',
    encoding:'base64',content:Buffer.from(content).toString('base64')});
  }
  if(path.startsWith('/git/commits/')&&opts.method==='GET'){
   const value=this.commits.get(path.split('/').at(-1));
   return value?this.response(200,{tree:{sha:value.tree}}):this.response(404);
  }
  if(path==='/git/blobs'&&opts.method==='POST'){
   const s=this.sha(this.i++);this.blobs.set(s,body.content);return this.response(201,{sha:s});
  }
  if(path==='/git/trees'&&opts.method==='POST'){
   const s=this.sha(this.i++),copy={...this.trees.get(body.base_tree)};
   for(const item of body.tree)copy[item.path]=this.blobs.get(item.sha);
   this.trees.set(s,copy);return this.response(201,{sha:s});
  }
  if(path==='/git/commits'&&opts.method==='POST'){
   const s=this.sha(this.i++);this.commits.set(s,{tree:body.tree,parents:body.parents});
   return this.response(201,{sha:s});
  }
  if(path==='/git/refs/heads/ops/parallel-claims'&&opts.method==='PATCH'){
   this.patchCount++;
   if(this.reject)return this.response(422);
   const descendant=(candidate,ancestor)=>{
    if(candidate===ancestor)return true;
    return this.commits.get(candidate)?.parents?.some(x=>descendant(x,ancestor))??false;
   };
   if(body.force!==false||!descendant(body.sha,this.head))return this.response(422);
   this.head=body.sha;return this.response(200,{object:{sha:body.sha}});
  }
  return this.response(404);
 }
}
const store=fake=>new GitHubFastForwardClaimStore({
 owner:'skyinnk',repo:'skyinnk',token:'fictional-token',fetchImpl:fake.fetch.bind(fake)
});
test('reads immutable commit snapshot',async()=>{
 const value=await store(new FakeGitHub()).read();
 assert.match(value.revision,/^[a-f0-9]{40}$/);assert.deepEqual(value.state,{claims:[]});
});
test('updates JSON through non-forced fast-forward',async()=>{
 const fake=new FakeGitHub(),client=store(fake),{revision}=await client.read();
 assert.equal(await client.compareAndSwap(revision,{claims:[{taskId:37}]}),true);
 assert.deepEqual((await client.read()).state.claims,[{taskId:37}]);
 assert.equal(fake.patchCount,1);
});
test('stale revision fails without writing objects',async()=>{
 const fake=new FakeGitHub(),client=store(fake),{revision}=await client.read();
 await client.compareAndSwap(revision,{claims:[{taskId:1}]});
 const before=fake.i;
 assert.equal(await client.compareAndSwap(revision,{claims:[{taskId:2}]}),false);
 assert.equal(fake.i,before);
});
test('simultaneous sibling commits cannot both win',async()=>{
 const fake=new FakeGitHub(),a=store(fake),b=store(fake),{revision}=await a.read();
 const result=await Promise.all([
  a.compareAndSwap(revision,{claims:[{taskId:35}]}),
  b.compareAndSwap(revision,{claims:[{taskId:36}]})
 ]);
 assert.deepEqual(result.sort(),[false,true]);assert.equal(fake.patchCount,2);
 assert.equal((await a.read()).state.claims.length,1);
});
test('30 competing writers produce exactly one winner',async()=>{
 const fake=new FakeGitHub(),clients=Array.from({length:30},()=>store(fake));
 const {revision}=await clients[0].read();
 const results=await Promise.all(clients.map((client,i)=>
  client.compareAndSwap(revision,{claims:[{taskId:i+1}]})));
 assert.equal(results.filter(Boolean).length,1);
 assert.equal((await clients[0].read()).state.claims.length,1);
});
test('unexplained 422 rejects rather than pretending a race',async()=>{
 const fake=new FakeGitHub();fake.reject=true;
 const client=store(fake),{revision}=await client.read();
 await assert.rejects(client.compareAndSwap(revision,{claims:[{taskId:1}]}),
  e=>e instanceof ClaimLedgerError&&e.code==='REF_UPDATE_REJECTED');
});
test('missing provisioned ledger fails closed',async()=>{
 const fake=new FakeGitHub();fake.noFile=true;
 await assert.rejects(store(fake).read(),e=>e.code==='NOT_PROVISIONED');
});
test('invalid revision, state, and configuration fail closed',async()=>{
 const fake=new FakeGitHub(),client=store(fake);
 await assert.rejects(client.compareAndSwap('bad',{claims:[]}),e=>e.code==='INVALID_GITHUB_RESPONSE');
 await assert.rejects(client.compareAndSwap(fake.head,{claims:'invalid'}),e=>e.code==='INVALID_STATE');
 assert.throws(()=>new GitHubFastForwardClaimStore({
  owner:'skyinnk',repo:'skyinnk',token:'x',branch:'main'
 }),e=>e.code==='INVALID_CONFIGURATION');
 assert.throws(()=>new GitHubFastForwardClaimStore({
  owner:'skyinnk',repo:'skyinnk',token:'x',path:'../secrets.json'
 }),e=>e.code==='INVALID_CONFIGURATION');
});
test('HTTP failure never reveals credential or provider message',async()=>{
 const client=new GitHubFastForwardClaimStore({
  owner:'skyinnk',repo:'skyinnk',token:'SENSITIVE-CREDENTIAL',
  fetchImpl:async()=>({status:403,ok:false,json:async()=>({message:'private detail'})})
 });
 await assert.rejects(client.read(),e=>e.code==='GITHUB_HTTP_403'&&
  !e.message.includes('SENSITIVE-CREDENTIAL')&&!e.message.includes('private detail'));
});
