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
const first = v => v?.length ? v[0] : null;
const sorted = values => [...values].sort((a,b)=>a.number-b.number);
const packet = (role,kind,{issue=null,pr=null,head=null,reason='',instructions='',priority=2}) => ({
  role,roleName:ROLES[role],kind,priority,issue,pr,head,
  idempotencyKey:[role,kind,issue||0,pr||0,head||'none'].join(':'),
  // No remote chat execution is proven merely by emitting an instruction.
  dispatchStatus:'BLOCKED_NO_VERIFIED_CHAT_TRIGGER',
  reason,instructions:instructions.trim()
});
export function plan({issues=[],prs=[],reviewsByPr={},checksByPr={},developmentSha='',event={}}) {
  if(!SHA.test(developmentSha))throw Error('Verified development SHA required');
  const activeIssues=sorted(issues.filter(i=>i.state==='open'&&!i.pull_request));
  const openPRs=sorted(prs.filter(p=>p.state==='open'));
  const packets=[],blockers=[];
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
    const head=pr.head?.sha;
    if(!SHA.test(head)){blockers.push('PR #'+pr.number+': missing head SHA');continue;}
    const reviews=reviewsByPr[pr.number]||[];
    const exact=reviews.filter(x=>x.headSha===head);
    const correction=exact.find(x=>x.verdict==='CHANGES_REQUESTED');
    const accepted=exact.find(x=>x.verdict==='ACCEPTED' && x.independent===true);
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
    const ci=checks.some(c=>c.headSha===head&&c.name==='Development CI'&&c.conclusion==='success');
    if(!ci){blockers.push('PR #'+pr.number+': required exact-head Development CI not verified');continue;}
    packets.push(packet('SDC 06','INTEGRATION_GATE',{issue:task.number,pr:pr.number,head,priority:1,reason:'Exact-head review/CI metadata accepted for further verification',instructions:'Check current development SHA, full PEA-2 dependency and protected-branch rules; integrate PR #'+pr.number+' only under existing authorization. Never bypass protection or merge on this packet alone.'}));
  }
  // Ready engineering issues without an active PR: assign the actual existing owner, not a generic coding worker.
  for(const issue of activeIssues){
    const state=section(issue.body,'Execution state');
    if(state!=='READY')continue;
    const role=assignedRole(issue.body);
    if(!role)continue;
    if(openPRs.some(p=>new RegExp('(?:^|\\n)Task issue:\\s*#'+issue.number+'\\b','i').test(p.body||'')))continue;
    packets.push(packet(role,'ELIGIBLE_TASK',{issue:issue.number,priority:3,reason:'READY task, requires live eligibility and ownership recheck',instructions:'After CURRENT and mandatory reviewer corrections, validate Issue #'+issue.number+' against the single global V1 milestone #58, current dependencies, task claims and open PRs; then use the existing '+role+' agent to execute one concise assignment. Do not claim started until that agent acknowledges a real run.'}));
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
    roles:ROLES,current,assignments:deduped,blockers,
    signal:{kind:event.kind||'snapshot',number:event.number||null},
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
  const reviewsByPr={},checksByPr={};
  for(const pr of prs){
    const reviews=await pages('pulls/'+pr.number+'/reviews',token,repo);
    // Existing free-text reviews are advisory. Do not guess verdicts from prose.
    reviewsByPr[pr.number]=reviews.map(x=>({
      headSha:x.commit_id||'',
      verdict:x.state==='CHANGES_REQUESTED'?'CHANGES_REQUESTED':'UNKNOWN',
      independent:false
    }));
    checksByPr[pr.number]=[];
  }
  return {issues,prs,reviewsByPr,checksByPr,developmentSha:dev.commit.sha};
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
