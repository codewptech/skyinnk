/**
 * GitHub-backed fast-forward CAS claim store for Skyinnk PEA-2 (#37).
 * Not a deployed dispatcher or permission grant. A separate trusted
 * owner-controlled identity must own and provision the ledger branch.
 * Preprovision an ops/* branch containing parallel-claims.json:
 * {"claims":[]}
 */
const SHA=/^[a-f0-9]{40}$/i;
const REPO=/^[A-Za-z0-9_.-]+$/;
const BRANCH=/^ops\/[a-z0-9][a-z0-9/-]*$/;
const PATH=/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*\.json$/;

export class ClaimLedgerError extends Error {
  constructor(code) {
    super('CLAIM_LEDGER_'+code);
    this.name='ClaimLedgerError';
    this.code=code;
  }
}
function sha(x) {
  if(!SHA.test(x??''))throw new ClaimLedgerError('INVALID_GITHUB_RESPONSE');
  return x;
}
function stateJson(s) {
  if(!s||!Array.isArray(s.claims)||Object.keys(s).some(k=>k!=='claims')) {
    throw new ClaimLedgerError('INVALID_STATE');
  }
  return JSON.stringify(s);
}
export class GitHubFastForwardClaimStore {
  constructor({owner,repo,token,branch='ops/parallel-claims',
    path='parallel-claims.json',fetchImpl=globalThis.fetch,timeoutMs=15000}={}) {
    if(![owner,repo].every(x=>typeof x==='string'&&REPO.test(x))||
      typeof token!=='string'||!token.trim()||!BRANCH.test(branch)||
      branch.includes('..')||branch.includes('//')||branch.endsWith('/')||
      !PATH.test(path)||path.includes('..')||
      typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||
      timeoutMs<1000||timeoutMs>60000)throw new ClaimLedgerError('INVALID_CONFIGURATION');
    this.endpoint='https://api.github.com/repos/'+owner+'/'+repo;
    this.branch=branch;this.path=path;this.fetchImpl=fetchImpl;
    this.timeoutMs=timeoutMs;
    this.headers={Authorization:'Bearer '+token,
      Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28'};
  }
  async request(method,path,body,allowed=[]) {
    const opts={method,headers:this.headers,signal:AbortSignal.timeout(this.timeoutMs)};
    if(body!==undefined) {
      opts.body=JSON.stringify(body);
      opts.headers={...this.headers,'Content-Type':'application/json'};
    }
    let response;
    try{response=await this.fetchImpl(this.endpoint+path,opts);}
    catch{throw new ClaimLedgerError('NETWORK_FAILURE');}
    if(allowed.includes(response.status))return {status:response.status};
    if(!response.ok)throw new ClaimLedgerError('GITHUB_HTTP_'+response.status);
    try{return {status:response.status,data:await response.json()};}
    catch{throw new ClaimLedgerError('INVALID_GITHUB_RESPONSE');}
  }
  async currentHead(){
    const {data}=await this.request('GET','/git/ref/heads/'+this.branch);
    if(data?.object?.type!=='commit')throw new ClaimLedgerError('INVALID_GITHUB_RESPONSE');
    return sha(data.object.sha);
  }
  async read() {
    const revision=await this.currentHead();
    // Fetch the state by immutable commit SHA, NOT by moving branch ref.
    const file=await this.request('GET','/contents/'+this.path+
      '?ref='+encodeURIComponent(revision),undefined,[404]);
    if(file.status===404)throw new ClaimLedgerError('NOT_PROVISIONED');
    if(file.data?.type!=='file'||file.data?.encoding!=='base64'||
      typeof file.data?.content!=='string')throw new ClaimLedgerError('INVALID_GITHUB_RESPONSE');
    let state;
    try{state=JSON.parse(Buffer.from(file.data.content.replace(/\s/g,''),'base64').toString('utf8'));}
    catch{throw new ClaimLedgerError('INVALID_STATE');}
    stateJson(state);
    return {revision,state};
  }
  async compareAndSwap(revision,state) {
    sha(revision);
    const content=stateJson(state);
    if(await this.currentHead()!==revision)return false;
    const {data:parent}=await this.request('GET','/git/commits/'+revision);
    const baseTree=sha(parent?.tree?.sha);
    const {data:blob}=await this.request('POST','/git/blobs',{content,encoding:'utf-8'});
    const {data:tree}=await this.request('POST','/git/trees',{
      base_tree:baseTree,
      tree:[{path:this.path,mode:'100644',type:'blob',sha:sha(blob?.sha)}]
    });
    const {data:commit}=await this.request('POST','/git/commits',{
      message:'PEA-2 claim ledger update (no source change)',
      tree:sha(tree?.sha),parents:[revision]
    });
    const next=sha(commit?.sha);
    // GitHub evaluates the non-forced fast-forward constraint on the ref update.
    // A read-then-write expected SHA check by itself is NOT atomic.
    const updated=await this.request('PATCH','/git/refs/heads/'+this.branch,
      {sha:next,force:false},[409,422]);
    if(updated.status===409||updated.status===422){
      if(await this.currentHead()!==revision)return false;
      throw new ClaimLedgerError('REF_UPDATE_REJECTED');
    }
    if(sha(updated.data?.object?.sha)!==next)throw new ClaimLedgerError('INVALID_GITHUB_RESPONSE');
    return true;
  }
}
