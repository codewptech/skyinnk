#!/usr/bin/env node
// Skyinnk SDC controller: coordination only. NEVER invokes coding models, merges, or writes to GitHub.
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const ROLES = Object.freeze({
  'SDC 01': 'Architecture Authority',
  'SDC 02': 'Experience Engineer',
  'SDC 03': 'Independent Review Director',
  'SDC 04': 'Systems Engineer',
  'SDC 05': 'Repair Engineer',
  'SDC 06': 'Integration Engineer',
  'Steward': 'Repository Steward',
});
const SOURCE_ROLES = Object.freeze({ 'Chat 01':'SDC 01', 'Chat 03':'SDC 04', 'Work':'SDC 02' });
const SHA = /^[a-f0-9]{40}$/i;
const COMPLETED = new Set(['DONE','CANCELLED','DEFERRED']);
const CURRENT = new Set(['CLAIMED','BUILDING','PR_OPEN','REVIEWING','CHANGES_REQUESTED','READY_TO_INTEGRATE','INTEGRATING']);
const line = (body,name) => (body||'').match(new RegExp('^'+name+':\\s*(.*)$','im'))?.[1]?.trim()||'';
const section = (body,name) => (body||'').match(new RegExp('^### '+name+'\\s*\\n([^\\n]*)','im'))?.[1]?.trim()||'';
const assignedRole = body => SOURCE_ROLES[line(body,'Workstream')] || null;
// Fail closed when independent review or eligibility evidence is unavailable.
const activeDependency=(body,key)=>{
  const chunk=(body||'').match(/^### Dependencies\s*\n([\s\S]*?)(?=^### |$(?![\s\S]))/m)?.[1]||'';
  const row=chunk.match(new RegExp('^\\s*-\\s*'+key+':\\s*(.*?)\\s*$','im'))?.[1];
  return row===undefined?null:row.trim().toLowerCase()==='none'?[]:[row.trim()];
};
const claimedPaths=(body)=>{
  const chunk=(body||'').match(/^### Owned \/ affected paths\s*\n([\s\S]*?)(?=^### |$(?![\s\S]))/m)?.[1]||'';
  return [...chunk.matchAll(/^\s*-\s*`([^`]+)`\s*$/gm)].map(x=>x[1]);
};
const sorted = values => [...values].sort((a,b)=>a.number-b.number);
const packet = (role,kind,{issue=null,pr=null,head=null,reason='',instructions='',priority=2}) => ({
  role,roleName:ROLES[role],kind,priority,issue,pr,head,
  idempotencyKey:[role,kind,issue||0,pr||0,head||'none'].join(':'),
  // No remote chat execution is proven merely by emitting an instruction.
  dispatchStatus:'BLOCKED_NO_VERIFIED_CHAT_TRIGGER',
  reason,instructions:instructions.trim()
});
export function plan({issues=[],prs=[],reviewsByPr={},checksByPr={},filesByPr={},evidenceErrorsByPr={},developmentSha='',event={}}) {
  if(!SHA.test(developmentSha))throw Error('Verified development SHA required');
  const activeIssues=sorted(issues.filter(i=>i.state==='open'&&!i.pull_request));
  // Never route a production or otherwise unrelated PR into the V1 development queue.
  // Missing target metadata is also a blocking evidence gap, not permission to guess.
  const candidates=prs.filter(p=>p.state==='open');
  const openPRs=sorted(candidates.filter(p=>p.base?.ref==='development/v1-public-launch'));
  const packets=[],blockers=candidates
    .filter(p=>p.base?.ref!=='development/v1-public-launch')
    .map(p=>'PR #'+p.number+': not a verified development-targeted PR');
  const issueByNumber=new Map(issues.map(i=>[i.number,i]));
  // A role's CURRENT assignment is not preempted by an unrelated new task.
  const current={};
  for(const issue of activeIssues){
    const role=assignedRole(issue.body), state=section(issue.body,'Execution state');
    if(role&&CURRENT.has(state)) (current[role]??=[]).push(issue.number);
  }
  for(const pr of openPRs){
    const match=(pr.body||'').match(/(?:^|\n)Task issue:\s*#(\d+)\b/i);
    const task=match?issueByNumber.get(Number(match[1])):null;
    if(!task){blockers.push('PR #'+pr.number+': missing linked task issue');continue;}
    const owner=assignedRole(task.body);
    if(!owner){blockers.push('PR #'+pr.number+': unknown workstream');continue;}
    if(pr.draft)continue;
    if(evidenceErrorsByPr[pr.number]?.length){blockers.push('PR #'+pr.number+': GitHub evidence unavailable: '+evidenceErrorsByPr[pr.number].join('; '));continue;}
    const head=pr.head?.sha;
    if(!SHA.test(head)){blockers.push('PR #'+pr.number+': missing head SHA');continue;}
    const reviews=reviewsByPr[pr.number]||[];
    // A superseded review from the SAME authenticated independent reviewer must
    // not permanently block a later approval (or hide a later correction).
    // GitHub native review IDs increase as review submissions are created.
    const exact=reviews.filter(x=>x.headSha===head && x.independent===true)
      .sort((a,b)=>(a.reviewId||0)-(b.reviewId||0));
    const latestByReviewer=new Map();
    for(const review of exact){
      latestByReviewer.set(review.reviewerLogin||'synthetic-reviewer',review);
    }
    const latest=[...latestByReviewer.values()];
    const correction=latest.find(x=>x.verdict==='CHANGES_REQUESTED');
    const accepted=latest.find(x=>x.verdict==='ACCEPTED');
    if(correction){
      // SDC 05 performs the repair coordination, but retains the ORIGINAL PEA-2 file owner.
      const repair=packet('SDC 05','REVIEW_CORRECTION',{issue:task.number,pr:pr.number,head,priority:0,reason:'Exact-head independent correction',instructions:'Finish CURRENT first. Repair PR #'+pr.number+' using the existing source owner '+owner+' and its PEA-2 branch/path claims. Re-read actual reviewer findings; do not impersonate an independent review, preempt current work, or expand ownership.'});
      packets.push({...repair,sourceOwner:owner});
      continue;
    }
    if(!accepted){
      packets.push(packet('SDC 03','INDEPENDENT_REVIEW',{issue:task.number,pr:pr.number,head,priority:1,reason:'No machine-verifiable exact-head independent acceptance',instructions:'Independently review PR #'+pr.number+' at exact head '+head+'. Verify implementation, CI, claims, and relevant regression evidence. Record a real review, do not approve your own code.'}));
      continue;
    }
    const checks=checksByPr[pr.number]||[];
    // Only the latest authenticated check-run at this exact SHA can satisfy
    // CI. A previous green attempt must never override a newer failing run.
    const latestCi=checks.filter(c=>c.headSha===head&&c.name==='Development CI')
      .sort((a,b)=>(a.id||0)-(b.id||0)).at(-1);
    const ci=latestCi?.conclusion==='success';
    if(!ci){blockers.push('PR #'+pr.number+': required exact-head Development CI not verified');continue;}
    packets.push(packet('SDC 06','INTEGRATION_GATE',{issue:task.number,pr:pr.number,head,priority:1,reason:'Exact-head review/CI metadata accepted for further verification',instructions:'Check current development SHA, full PEA-2 dependency and protected-branch rules; integrate PR #'+pr.number+' only under existing authorization. Never bypass protection or merge on this packet alone.'}));
  }
  // Ready engineering issues without an active PR: queue one NEXT eligible task per
  // actual executor lane, never fan out simultaneous new assignments to that lane.
  // A later READY task stays queued until the earlier eligible task is handed off.
  const selectedReadyRoles=new Set();
  const queuedReady=[];
  for(const issue of activeIssues){
    const state=section(issue.body,'Execution state');
    if(state!=='READY')continue;
    const role=assignedRole(issue.body);
    if(!role)continue;
    // PEA-2 ownership is a hard readiness condition, not a suggestion to a worker.
    const branch=line(issue.body,'Branch').replace(/^`([^`]+)`$/,'$1');
    const target=line(issue.body,'Target').replace(/^`([^`]+)`$/,'$1');
    const prefix=role==='SDC 01'?'chat01':role==='SDC 02'?'work':'chat03';
    if(target!=='development/v1-public-launch'||!new RegExp('^'+prefix+'/task-[\\w-]+new RegExp('(?:^|\\n)Task issue:\\s*#'+issue.number+'\\b','i').test(p.body||'')))continue;
    if(current[role]?.length){blockers.push('Issue #'+issue.number+': '+role+' CURRENT work not finished');continue;}
    if(issue.number>43){
      const start=activeDependency(issue.body,'START');
      const integrate=activeDependency(issue.body,'INTEGRATION');
      if(start===null||integrate===null){blockers.push('Issue #'+issue.number+': unverified typed dependencies');continue;}
      if(start.length||integrate.length){blockers.push('Issue #'+issue.number+': dependency integration not verified');continue;}
    }
    const paths=claimedPaths(issue.body);
    if(!paths.length){blockers.push('Issue #'+issue.number+': no exact claimed paths; not eligible');continue;}
    if(openPRs.some(pr=>(filesByPr[pr.number]||[]).some(path=>paths.includes(path)))){
      blockers.push('Issue #'+issue.number+': claimed paths overlap an open PR');continue;
    }
    if(openPRs.some(pr=>!Array.isArray(filesByPr[pr.number]))){
      blockers.push('Issue #'+issue.number+': current PR path evidence unavailable');continue;
    }
    if(selectedReadyRoles.has(role)){
      queuedReady.push({role,issue:issue.number,reason:'AWAIT_PREVIOUS_ELIGIBLE_TASK_HANDOFF'});
      continue;
    }
    packets.push(packet(role,'ELIGIBLE_TASK',{issue:issue.number,priority:3,reason:'READY task, requires live eligibility and ownership recheck',instructions:'After CURRENT and mandatory reviewer corrections, validate Issue #'+issue.number+' against the single global V1 milestone #58, current dependencies, task claims and open PRs; then use the existing '+role+' agent to execute one concise assignment. Do not claim started until that agent acknowledges a real run.'}));
    selectedReadyRoles.add(role);
  }
  if(event.kind==='push'){
    packets.push(packet('SDC 03','MILESTONE_REAUDIT',{head:developmentSha,priority:2,reason:'Verified development push event requires updated global milestone assessment',instructions:'Read merged PR and successful post-merge Development CI at '+developmentSha+'; re-audit current global V1 milestone #58, update acceptance evidence, and prepare only the next eligible global milestone. Do not treat this routing packet as an executed review.'}));
  }
  packets.push(packet('Steward','CLEANUP_AUDIT',{priority:4,reason:'Maintenance only',instructions:'Inspect obsolete refs and claims; preserve unique commits and V1 work; record a concise cleanup report in Issue #2. Do not replace engineering/review roles.'}));
  const seen=new Set();
  const deduped=packets.filter(p=>{if(seen.has(p.idempotencyKey))return false;seen.add(p.idempotencyKey);return true;});
  deduped.sort((a,b)=>a.priority-b.priority||a.role.localeCompare(b.role)||(a.issue||0)-(b.issue||0)||(a.pr||0)-(b.pr||0));
  return {schemaVersion:1,controller:'Skyinnk SDC Role Orchestrator',developmentSha,
    status:'ROUTING_ONLY_NO_AGENT_DISPATCH',
    roles:ROLES,current,assignments:deduped,queuedReady,blockers,
    signal:{kind:event.kind||'snapshot',number:event.number||null},
    deduplication:'IN_MEMORY_THIS_SNAPSHOT_ONLY_NOT_PERSISTENT',
    summary:{assignments:deduped.length,actualAgentRunsStarted:0,automaticMerges:0}};
}
async function api(route,token,repo){
  const url='https://api.github.com/repos/'+repo+'/'+route;
  const response=await fetch(url,{headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{'Authorization':'Bearer '+token}:{})}});
  if(!response.ok)throw Error('GitHub API '+response.status+' at '+route);
  return response.json();
}
async function pages(path,token,repo){
  const all=[];
  for(let page=1;page<=10;page++){
    const separator=path.includes('?')?'&':'?';
    const list=await api(path+separator+'per_page=100&page='+page,token,repo);
    if(!Array.isArray(list))throw Error('Expected GitHub list: '+path);
    all.push(...list);
    if(list.length<100)return all;
  }
  throw Error('Pagination limit reached; refuse incomplete queue');
}
export async function snapshot({token,repo}){
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error('Invalid repository');
  const [issues,prs,dev]=await Promise.all([
    pages('issues?state=open',token,repo),pages('pulls?state=open',token,repo),
    api('branches/development/v1-public-launch',token,repo)
  ]);
  if(!SHA.test(dev.commit?.sha))throw Error('Invalid current development revision');
  const reviewsByPr={},checksByPr={},filesByPr={},evidenceErrorsByPr={};
  // A reviewer must have an allowlisted, different GitHub identity and
  // submit a native exact-head approval. AI-authored COMMENTED is never approval.
  const trusted=new Set((process.env.SDC_TRUSTED_REVIEWER_LOGINS||'').split(',').map(s=>s.trim()).filter(Boolean));
  for(const pr of prs){
    const errors=[];
    try {
      const reviews=await pages('pulls/'+pr.number+'/reviews',token,repo);
      reviewsByPr[pr.number]=reviews.map(x=>{
        const login=x.user?.login||'';
        const independent=trusted.has(login)&&login!==pr.user?.login;
        return {
          headSha:x.commit_id||'',
          reviewerLogin:login,
          reviewId:x.id,
          verdict:independent&&x.state==='APPROVED'?'ACCEPTED':independent&&x.state==='CHANGES_REQUESTED'?'CHANGES_REQUESTED':'UNKNOWN',
          independent,
        };
      });
    } catch(error){errors.push('reviews: '+error.message);reviewsByPr[pr.number]=[];}
    try {
      const checks=await api('commits/'+pr.head.sha+'/check-runs?per_page=100',token,repo);
      if(!Array.isArray(checks.check_runs))throw Error('invalid check-run response');
      checksByPr[pr.number]=checks.check_runs.filter(c=>
        c.name==='Development CI'&&c.app?.slug==='github-actions'
      ).map(c=>({id:c.id,headSha:c.head_sha,name:c.name,conclusion:c.conclusion}));
    } catch(error){errors.push('check-runs: '+error.message);checksByPr[pr.number]=[];}
    try {
      const changed=await pages('pulls/'+pr.number+'/files',token,repo);
      filesByPr[pr.number]=changed.flatMap(f=>f.previous_filename?[f.filename,f.previous_filename]:[f.filename]);
    } catch(error){errors.push('changed-files: '+error.message);filesByPr[pr.number]=null;}
    if(errors.length)evidenceErrorsByPr[pr.number]=errors;
  }
  return {issues,prs,reviewsByPr,checksByPr,filesByPr,evidenceErrorsByPr,developmentSha:dev.commit.sha};
}
export async function main(){
  const outArg=process.argv.indexOf('--out');
  const output=outArg>=0?process.argv[outArg+1]:null;
  if(outArg>=0&&!output)throw Error('Missing --out path');
  const repo=process.env.GITHUB_REPOSITORY||'codewptech/skyinnk';
  const data=await snapshot({repo,token:process.env.GITHUB_TOKEN||''});
  const result=plan({...data,event:{kind:process.env.GITHUB_EVENT_NAME||'manual'}});
  const json=JSON.stringify(result,null,2)+'\n';
  if(output)await writeFile(output,json);
  else process.stdout.write(json);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(err=>{console.error('ORCHESTRATION BLOCKED: '+err.message);process.exitCode=1;});
}
).test(branch)){
      blockers.push('Issue #'+issue.number+': PEA-2 target/branch ownership not verified');
      continue;
    }
    if(openPRs.some(p=>new RegExp('(?:^|\\n)Task issue:\\s*#'+issue.number+'\\b','i').test(p.body||'')))continue;
    if(current[role]?.length){blockers.push('Issue #'+issue.number+': '+role+' CURRENT work not finished');continue;}
    if(issue.number>43){
      const start=activeDependency(issue.body,'START');
      const integrate=activeDependency(issue.body,'INTEGRATION');
      if(start===null||integrate===null){blockers.push('Issue #'+issue.number+': unverified typed dependencies');continue;}
      if(start.length||integrate.length){blockers.push('Issue #'+issue.number+': dependency integration not verified');continue;}
    }
    const paths=claimedPaths(issue.body);
    if(!paths.length){blockers.push('Issue #'+issue.number+': no exact claimed paths; not eligible');continue;}
    if(openPRs.some(pr=>(filesByPr[pr.number]||[]).some(path=>paths.includes(path)))){
      blockers.push('Issue #'+issue.number+': claimed paths overlap an open PR');continue;
    }
    if(openPRs.some(pr=>!Array.isArray(filesByPr[pr.number]))){
      blockers.push('Issue #'+issue.number+': current PR path evidence unavailable');continue;
    }
    if(selectedReadyRoles.has(role)){
      queuedReady.push({role,issue:issue.number,reason:'AWAIT_PREVIOUS_ELIGIBLE_TASK_HANDOFF'});
      continue;
    }
    packets.push(packet(role,'ELIGIBLE_TASK',{issue:issue.number,priority:3,reason:'READY task, requires live eligibility and ownership recheck',instructions:'After CURRENT and mandatory reviewer corrections, validate Issue #'+issue.number+' against the single global V1 milestone #58, current dependencies, task claims and open PRs; then use the existing '+role+' agent to execute one concise assignment. Do not claim started until that agent acknowledges a real run.'}));
    selectedReadyRoles.add(role);
  }
  if(event.kind==='push'){
    packets.push(packet('SDC 03','MILESTONE_REAUDIT',{head:developmentSha,priority:2,reason:'Verified development push event requires updated global milestone assessment',instructions:'Read merged PR and successful post-merge Development CI at '+developmentSha+'; re-audit current global V1 milestone #58, update acceptance evidence, and prepare only the next eligible global milestone. Do not treat this routing packet as an executed review.'}));
  }
  packets.push(packet('Steward','CLEANUP_AUDIT',{priority:4,reason:'Maintenance only',instructions:'Inspect obsolete refs and claims; preserve unique commits and V1 work; record a concise cleanup report in Issue #2. Do not replace engineering/review roles.'}));
  const seen=new Set();
  const deduped=packets.filter(p=>{if(seen.has(p.idempotencyKey))return false;seen.add(p.idempotencyKey);return true;});
  deduped.sort((a,b)=>a.priority-b.priority||a.role.localeCompare(b.role)||(a.issue||0)-(b.issue||0)||(a.pr||0)-(b.pr||0));
  return {schemaVersion:1,controller:'Skyinnk SDC Role Orchestrator',developmentSha,
    status:'ROUTING_ONLY_NO_AGENT_DISPATCH',
    roles:ROLES,current,assignments:deduped,queuedReady,blockers,
    signal:{kind:event.kind||'snapshot',number:event.number||null},
    deduplication:'IN_MEMORY_THIS_SNAPSHOT_ONLY_NOT_PERSISTENT',
    summary:{assignments:deduped.length,actualAgentRunsStarted:0,automaticMerges:0}};
}
async function api(route,token,repo){
  const url='https://api.github.com/repos/'+repo+'/'+route;
  const response=await fetch(url,{headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{'Authorization':'Bearer '+token}:{})}});
  if(!response.ok)throw Error('GitHub API '+response.status+' at '+route);
  return response.json();
}
async function pages(path,token,repo){
  const all=[];
  for(let page=1;page<=10;page++){
    const separator=path.includes('?')?'&':'?';
    const list=await api(path+separator+'per_page=100&page='+page,token,repo);
    if(!Array.isArray(list))throw Error('Expected GitHub list: '+path);
    all.push(...list);
    if(list.length<100)return all;
  }
  throw Error('Pagination limit reached; refuse incomplete queue');
}
export async function snapshot({token,repo}){
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error('Invalid repository');
  const [issues,prs,dev]=await Promise.all([
    pages('issues?state=open',token,repo),pages('pulls?state=open',token,repo),
    api('branches/development/v1-public-launch',token,repo)
  ]);
  if(!SHA.test(dev.commit?.sha))throw Error('Invalid current development revision');
  const reviewsByPr={},checksByPr={},filesByPr={},evidenceErrorsByPr={};
  // A reviewer must have an allowlisted, different GitHub identity and
  // submit a native exact-head approval. AI-authored COMMENTED is never approval.
  const trusted=new Set((process.env.SDC_TRUSTED_REVIEWER_LOGINS||'').split(',').map(s=>s.trim()).filter(Boolean));
  for(const pr of prs){
    const errors=[];
    try {
      const reviews=await pages('pulls/'+pr.number+'/reviews',token,repo);
      reviewsByPr[pr.number]=reviews.map(x=>{
        const login=x.user?.login||'';
        const independent=trusted.has(login)&&login!==pr.user?.login;
        return {
          headSha:x.commit_id||'',
          reviewerLogin:login,
          reviewId:x.id,
          verdict:independent&&x.state==='APPROVED'?'ACCEPTED':independent&&x.state==='CHANGES_REQUESTED'?'CHANGES_REQUESTED':'UNKNOWN',
          independent,
        };
      });
    } catch(error){errors.push('reviews: '+error.message);reviewsByPr[pr.number]=[];}
    try {
      const checks=await api('commits/'+pr.head.sha+'/check-runs?per_page=100',token,repo);
      if(!Array.isArray(checks.check_runs))throw Error('invalid check-run response');
      checksByPr[pr.number]=checks.check_runs.filter(c=>
        c.name==='Development CI'&&c.app?.slug==='github-actions'
      ).map(c=>({id:c.id,headSha:c.head_sha,name:c.name,conclusion:c.conclusion}));
    } catch(error){errors.push('check-runs: '+error.message);checksByPr[pr.number]=[];}
    try {
      const changed=await pages('pulls/'+pr.number+'/files',token,repo);
      filesByPr[pr.number]=changed.flatMap(f=>f.previous_filename?[f.filename,f.previous_filename]:[f.filename]);
    } catch(error){errors.push('changed-files: '+error.message);filesByPr[pr.number]=null;}
    if(errors.length)evidenceErrorsByPr[pr.number]=errors;
  }
  return {issues,prs,reviewsByPr,checksByPr,filesByPr,evidenceErrorsByPr,developmentSha:dev.commit.sha};
}
export async function main(){
  const outArg=process.argv.indexOf('--out');
  const output=outArg>=0?process.argv[outArg+1]:null;
  if(outArg>=0&&!output)throw Error('Missing --out path');
  const repo=process.env.GITHUB_REPOSITORY||'codewptech/skyinnk';
  const data=await snapshot({repo,token:process.env.GITHUB_TOKEN||''});
  const result=plan({...data,event:{kind:process.env.GITHUB_EVENT_NAME||'manual'}});
  const json=JSON.stringify(result,null,2)+'\n';
  if(output)await writeFile(output,json);
  else process.stdout.write(json);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(err=>{console.error('ORCHESTRATION BLOCKED: '+err.message);process.exitCode=1;});
}
