// PEA-2 pure model. No network, GitHub credentials or source-tree mutations.

// PROPOSED enforcement library: not wired into required CI until #33/#34.

const ROLES = {"Chat 01":"chat01","Chat 03":"chat03","Work":"work"};

const STATES = new Set(["BACKLOG","READY","CLAIMED","BUILDING","PR_OPEN","REVIEWING","CHANGES_REQUESTED","READY_TO_INTEGRATE","INTEGRATING","VERIFIED","DONE","BLOCKED","DEFERRED","CANCELLED","REOPENED"]);

const TRANSITIONS = {
  "BACKLOG": [
    "READY",
    "DEFERRED",
    "CANCELLED"
  ],
  "READY": [
    "CLAIMED",
    "BLOCKED",
    "DEFERRED",
    "CANCELLED"
  ],
  "CLAIMED": [
    "BUILDING",
    "READY",
    "BLOCKED"
  ],
  "BUILDING": [
    "PR_OPEN",
    "BLOCKED",
    "CLAIMED",
    "CANCELLED"
  ],
  "PR_OPEN": [
    "REVIEWING",
    "CHANGES_REQUESTED",
    "BLOCKED"
  ],
  "REVIEWING": [
    "READY_TO_INTEGRATE",
    "CHANGES_REQUESTED",
    "BLOCKED"
  ],
  "CHANGES_REQUESTED": [
    "BUILDING",
    "BLOCKED"
  ],
  "READY_TO_INTEGRATE": [
    "INTEGRATING",
    "CHANGES_REQUESTED",
    "BLOCKED"
  ],
  "INTEGRATING": [
    "VERIFIED",
    "CHANGES_REQUESTED",
    "BLOCKED"
  ],
  "VERIFIED": [
    "DONE",
    "CHANGES_REQUESTED"
  ],
  "DONE": [
    "REOPENED"
  ],
  "BLOCKED": [
    "READY",
    "BUILDING",
    "PR_OPEN",
    "REVIEWING"
  ],
  "DEFERRED": [
    "BACKLOG"
  ],
  "CANCELLED": [
    "BACKLOG"
  ],
  "REOPENED": [
    "BACKLOG",
    "READY"
  ]
};

export function section(body,title){
const hit=body.match(new RegExp("^###\\s+"+title.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\s*\\n([\\s\\S]*?)(?=^###\\s|$(?![\\s\\S]))","im"));
return hit?.[1]?.trim()??"";
}

export function field(body,name){return body.match(new RegExp("^"+name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+":\\s*(.*)$","im"))?.[1]?.trim()??""}

export function paths(raw){return [...raw.matchAll(/^\s*-\s*`([^`]+)`(?:\s*.*)?$/gm)].map(m=>m[1]);}

export function refs(raw){if(/^\s*(none|none for implementation)\s*$/i.test(raw.trim()))return [];return [...raw.matchAll(/#(\d+)/g)].map(m=>Number(m[1]));}

export function parsePacket(body){
const dep=section(body,"Dependencies");
const depValue=(key)=>dep.match(new RegExp("^\\s*-\\s*"+key+":\\s*(.*)$","im"))?.[1]??"";
return {
workstream:field(body,"Workstream"),branch:field(body,"Branch").replace(/^`|`$/g,""),target:field(body,"Target"),
lane:field(body,"Delivery lane"),priority:field(body,"Priority"),risk:field(body,"Risk"),
state:section(body,"Execution state").split("\n")[0]?.trim()??"",executor:section(body,"Executor").split("\n")[0]?.trim()??"",
outcome:section(body,"Outcome"),acceptance:section(body,"Acceptance"),
owned:paths(section(body,"Owned / affected paths")),shared:paths(section(body,"Reserved shared paths")),
start:refs(depValue("START")),integration:refs(depValue("INTEGRATION")),soft:refs(depValue("SOFT")),
external:depValue("External approval"),depRaw:dep,
};
}

export function validatePacket(p,{number=null}={}){
const errors=[];
if(!ROLES[p.workstream])errors.push("Invalid Workstream");
if(!p.branch||!new RegExp("^"+(ROLES[p.workstream]??"invalid")+"/task-[a-z0-9]+(?:-[a-z0-9]+)*$").test(p.branch))errors.push("Branch does not match Workstream");
if(p.target!=="development/v1-public-launch")errors.push("Invalid target branch");
if(!["Learning Experience","Technical Foundation","Quality/Remediation","Governance"].includes(p.lane))errors.push("Invalid delivery lane");
if(p.lane==="Learning Experience"&&p.workstream!=="Work")errors.push("Learning Experience requires Work ownership");
if(p.lane==="Technical Foundation"&&p.workstream!=="Chat 03")errors.push("Technical Foundation requires Chat 03 ownership");
if(p.lane==="Governance"&&p.workstream!=="Chat 01")errors.push("Governance requires Chat 01 ownership");
if(!["P0","P1","P2","P3"].includes(p.priority))errors.push("Invalid priority");
if(!["ordinary","shared-interface","sensitive-governance","release-gated"].includes(p.risk))errors.push("Invalid risk");
if(!STATES.has(p.state))errors.push("Invalid execution state");
if(!p.executor||!p.outcome||p.outcome.length<20||!p.acceptance.includes("- [ ]"))errors.push("Missing executor, outcome or acceptance");
if(!p.depRaw||!p.external)errors.push("Missing dependencies or external approval");
for(const type of ["START","INTEGRATION","SOFT"]){
 const matches=[...p.depRaw.matchAll(new RegExp("^\\s*-\\s*"+type+":\\s*(.*)$","gmi"))];
 if(matches.length!==1||!/^(none|#\d+(?:[\s,]+#\d+)*)$/i.test(matches[0]?.[1]?.trim()??""))errors.push("Malformed "+type+" dependency list");
}
if(!p.external||/REPLACE_WITH/.test(p.external))errors.push("Invalid external approval field");
if(!p.owned.length)errors.push("Missing exact affected path");
if(new Set(p.owned).size!==p.owned.length||new Set(p.shared).size!==p.shared.length)errors.push("Duplicate path claim");
if(p.owned.some(x=>x.startsWith("/")||x.includes("..")||x.includes("*")||x.startsWith("REPLACE")||x.trim()!==x))errors.push("Invalid affected path");
if(p.shared.some(x=>x.startsWith("/")||x.includes("..")||x.includes("*")||x.startsWith("REPLACE")))errors.push("Invalid reserved path");
if([p.outcome,p.acceptance,p.executor,p.branch,p.lane,p.risk,p.priority].some(x=>/REPLACE_WITH|describe one|one objectively|pending executable task/i.test(x)))errors.push("Unfilled template placeholder");
if(number!==null&&[...p.start,...p.integration,...p.soft].includes(number))errors.push("Self dependency");
if(new Set([...p.start,...p.integration,...p.soft]).size!==p.start.length+p.integration.length+p.soft.length)errors.push("Repeated dependency");
if(p.state==="READY"&&p.executor!=="unclaimed")errors.push("READY task must be unclaimed");
// START completion is verified against live issue states in eligibleTask, not guessed from this static packet.
if(["CLAIMED","BUILDING"].includes(p.state)&&p.executor==="unclaimed")errors.push("Active task needs real executor");
return errors;
}

export function changePaths(files){
const v=new Set();
for(const f of files||[]){
 const entries=typeof f==="string"?[f]:f?.status==="renamed"?[f.previous_filename,f.filename]:[f?.filename];
 for(const name of entries){if(typeof name!=="string"||!name||name.startsWith("/"))throw new Error("Incomplete changed path");v.add(name);}
}
return [...v];
}

export function eligibleTask(p,{issueStates={},claims=[],openPRs=[]}={}){
const reasons=[];
if(p.state!=="READY")reasons.push("Not READY");
for(const n of p.start)if(issueStates[n]!=="DONE")reasons.push("START dependency #"+n+" not DONE");
const owned=new Set([...p.owned,...p.shared]);
for(const c of claims)if(c.branch!==p.branch&&changePaths(c.paths).some(x=>owned.has(x)))reasons.push("Active task claim conflict: "+c.id);
for(const pr of openPRs)if(pr.branch!==p.branch&&changePaths(pr.files).some(x=>owned.has(x)))reasons.push("Open PR conflict: #"+pr.number);
return {eligible:reasons.length===0,reasons};
}


// Evidence must be tied to the immutable PR head; caller must fetch trusted GitHub data.
// A model-reported technical review is advisory, NOT GitHub's authenticated approval.
export function integrationEligible(p,{
  issueStates={},pr=null,checks=[],reviews=[],currentBaseSha="",collisions=[]
}={}){
  const reasons=[];
  if(p.state!=="READY_TO_INTEGRATE")reasons.push("Not ready-to-integrate");
  for(const n of p.integration)if(issueStates[n]!=="DONE")reasons.push("INTEGRATION dependency #"+n+" not DONE");
  const sha=/^[a-f0-9]{40}$/i;
  if(!pr||pr.state!=="open"||!sha.test(pr.headSha??"")||!sha.test(pr.baseSha??"")){
    reasons.push("Missing exact-head open PR");
  }else{
    if(pr.baseSha!==currentBaseSha)reasons.push("PR base not reconciled against current development");
    if(!checks.some(c=>c.headSha===pr.headSha&&c.name==="Development CI"&&c.conclusion==="success")){
      reasons.push("Required CI has no success evidence for exact PR head");
    }
    if(!reviews.some(r=>r.headSha===pr.headSha&&r.kind==="technical"&&r.verdict==="accepted"&&
          typeof r.reviewer==="string"&&r.reviewer&&r.reviewer!==pr.executor)){
      reasons.push("Independent technical review evidence missing for exact PR head");
    }
  }
  if(collisions.length)reasons.push("Unresolved changed-path collisions: "+collisions.join(", "));
  return {eligible:reasons.length===0,reasons};
}

// Only known issue/PR IDs can be dependencies. START must refer to task issues.
export function validateGraph(tasks,{knownPullRequests=[]}={}){
  const issues=new Map(tasks.map(t=>[t.number,t.packet]));
  const prs=new Set(knownPullRequests);
  const errors=[];
  if(issues.size!==tasks.length)errors.push("Duplicate issue number in graph");
  for(const t of tasks){
    for(const n of t.packet.start??[])if(!issues.has(n))errors.push("#"+t.number+" missing START issue #"+n);
    for(const kind of ["integration","soft"]){
      for(const n of t.packet[kind]??[])if(!issues.has(n)&&!prs.has(n))errors.push("#"+t.number+" missing "+kind+" reference #"+n);
    }
  }
  for(const cycle of detectCycles(tasks))errors.push("Dependency cycle: "+cycle.join(" -> "));
  return errors;
}

export function detectCycles(tasks){
const map=new Map(tasks.map(x=>[x.number,x.packet]));const seen=new Set(),path=new Set(),cycles=[];
function dfs(n,chain){if(path.has(n)){cycles.push([...chain,n]);return;}if(seen.has(n))return;seen.add(n);path.add(n);for(const x of [...(map.get(n)?.start??[]),...(map.get(n)?.integration??[])])if(map.has(x))dfs(x,[...chain,n]);path.delete(n);}
for(const x of map.keys())dfs(x,[]);
return cycles;
}

export function nextStateLegal(from,to){return (TRANSITIONS[from]??[]).includes(to);}

export function rankReady(a,b){
const score={"P0":0,"P1":1,"P2":2,"P3":3};
return (score[a.priority]??9)-(score[b.priority]??9)||(b.unlocks??0)-(a.unlocks??0)||(a.created??0)-(b.created??0)||(a.number??0)-(b.number??0);
}

