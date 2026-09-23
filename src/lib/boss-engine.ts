import { extractionDefensivePrompt, getExtractionLessons } from "@/lib/extraction-resilience";
/** Boss Engine core ported from Panupan33. */
export type PlanStepStatus = "pending" | "running" | "done" | "failed";
export type BossPlanStep = { id:string; title:string; needs:string[]; dependsOn:string[]; status:PlanStepStatus };
export type BossPlan = { goal:string; steps:BossPlanStep[] };
export type ModelTier = "cheap" | "standard" | "strong" | "coding";
export type BossRuntime = { plan:BossPlan; tier:ModelTier; round:number; maxRounds:number; recentFailures:string[]; evidence:string[] };
const uid=(p:string)=>p+"_"+Math.random().toString(36).slice(2,9);
export function decomposeGoal(goal:string):BossPlanStep[]{const t=goal.toLowerCase(),s:BossPlanStep[]=[];const add=(title:string,needs:string[],dependsOn:string[]=[])=>(s.push({id:uid("s"),title,needs,dependsOn,status:"pending"}),s[s.length-1]!);let last=add("Understand request",["chat"]).id;if(/ค้นหา|search|research|หาข้อมูล|เว็บ/.test(t))last=add("Research / inspect context",["web","search"],[last]).id;if(/สร้าง|เขียน|แก้|code|โค้ด|เว็บ|แอป|bug|error|debug|build/.test(t)){last=add("Plan implementation",["code"],[last]).id;last=add("Build / edit",["code"],[last]).id;last=add("Run / observe",["runtime"],[last]).id;}if(/github|repo|commit|branch|pull request|pr\b/.test(t))last=add("GitHub operation",["github"],[last]).id;if(/deploy|ดีพลอย|render|vercel|publish|hosting|preview/.test(t))last=add("Deploy / preview",["deploy","web"],[last]).id;if(s.length===1)last=add("Respond",["chat"],[last]).id;add("Verify result",["verify"],[last]);return s;}
export function routeModelTier(prompt:string):ModelTier{const t=prompt.toLowerCase();if(/architecture|security|multi-file|ทั้งระบบ|debug ยาก|ci fail|refactor/.test(t)||prompt.length>1400)return"strong";if(/code|โค้ด|เขียน|แก้|bug|typescript|tsx|sandbox|build/.test(t))return"coding";if(/ค้นหา|search|research|อธิบาย|สรุป/.test(t))return"standard";if(/^(คับ|ครับ|ok|โอเค|ได้)[!.\s]*$/i.test(prompt.trim()))return"cheap";return"standard";}
export function createBossRuntime(goal:string):BossRuntime{return{plan:{goal,steps:decomposeGoal(goal)},tier:routeModelTier(goal),round:0,maxRounds:6,recentFailures:[],evidence:[]};}
export function nextStep(plan:BossPlan):BossPlanStep|null{return plan.steps.find(s=>(s.status==="pending"||s.status==="failed")&&s.dependsOn.every(d=>plan.steps.find(x=>x.id===d)?.status==="done"))??null;}
export function markStep(plan:BossPlan,stepId:string,status:PlanStepStatus):BossPlan{return{...plan,steps:plan.steps.map(s=>s.id===stepId?{...s,status}:s)};}
export function detectLoop(names:string[],window=4):boolean{if(names.length<window)return false;const s=names.slice(-window);return s.every(x=>x===s[0])||(s[0]===s[2]&&s[1]===s[3]&&s[0]!==s[1]);}
export function diagnose(error:string):string{const t=error.toLowerCase();if(/401|unauthorized|api key|token/.test(t))return"authentication / credential failure";if(/403|forbidden|permission/.test(t))return"permission failure";if(/404|not found|module not found/.test(t))return"missing route / file / dependency";if(/502|503|timeout|gateway|econnreset/.test(t))return"upstream or deployment availability failure";if(/typescript|type error|ts\d+/.test(t))return"TypeScript failure";if(/referenceerror|typeerror|undefined/.test(t))return"runtime JavaScript failure";return"unclassified runtime failure, inspect the concrete error";}
export function recoveryInstruction(error:string,failures:string[]):string{const d=diagnose(error),n=failures.filter(x=>x===d).length;if(n>=2)return"RECOVERY ESCALATION: "+d+". Change approach and verify.";return["RECOVERY LOOP","1. Diagnose: "+d,"2. Use observed error evidence only.","3. Change the smallest relevant part.","4. Run again.","5. Verify the real result before claiming success."].join("\n");}
export function verifyGeneration(raw:string){const evidence:string[]=[];if(raw.trim())evidence.push("model_response_non_empty");if(/<!doctype html|<html[\s>]/i.test(raw))evidence.push("full_html_detected");if(raw.toLowerCase().includes("suggestions"))evidence.push("suggestions_detected");return{ok:evidence.includes("full_html_detected"),evidence,reason:evidence.includes("full_html_detected")?"generated HTML passed output gate":"HTML output gate not satisfied"};}
export function buildBossContext(prompt:string,historyLength:number,hasExistingHtml:boolean):string{const r=createBossRuntime(prompt),steps=r.plan.steps.map((s,i)=>(i+1)+". ["+s.status+"] "+s.title+" ["+s.needs.join(", ")+"]").join("\n");const extraction=/ดึงข้อมูล|scrap|scrape|web scraping|api extraction|extract|ราคาสินค้า|รายการข้อมูล/i.test(prompt);const lessons=extraction?getExtractionLessons(prompt).map(x=>`- ${x.kind}: ${x.cause} -> ${x.strategy}`).join("\n"):"";return["=== BOSS ENGINE ===","Truth contract: never claim build, edit, deploy, test, search, or verification without real evidence.","Model tier: "+r.tier,"Conversation turns: "+historyLength,"Existing app HTML: "+(hasExistingHtml?"yes":"no"),"Execution plan:",steps,"Work loop: analyze -> act -> observe -> recover if needed -> verify.",extraction?extractionDefensivePrompt(prompt):"","Previous extraction lessons:",lessons||"(no matching lessons yet)","For build/edit requests return the complete updated HTML required by the product contract.","Keep user-facing explanation short.","=== END BOSS ENGINE ==="].join("\n");}
export type BossIntent = "chat" | "search" | "build" | "edit" | "debug" | "github" | "deploy" | "research";
export type BossLiveStatus = "กำลังอ่านคำขอ" | "กำลังวางแผน" | "กำลังค้นหา" | "กำลังสร้าง/แก้ไข" | "กำลังตรวจสอบผล" | "กำลังแก้ไขปัญหา" | "เรียบร้อย";

export function classifyBossIntent(prompt: string): BossIntent {
  const t = prompt.toLowerCase();
  if (/ค้นหา|search|research|หาข้อมูล|เว็บ|ข่าว/.test(t)) return "search";
  if (/github|repo|commit|branch|pull request|pr\b/.test(t)) return "github";
  if (/deploy|ดีพลอย|render|vercel|publish|hosting/.test(t)) return "deploy";
  if (/debug|bug|error|ผิดพลาด|แก้บั๊ก/.test(t)) return "debug";
  if (/แก้|edit|ปรับ|เปลี่ยน|modify/.test(t)) return "edit";
  if (/สร้าง|เขียน|build|code|โค้ด|เว็บ|แอป/.test(t)) return "build";
  if (/ศึกษา|วิเคราะห์|เปรียบเทียบ|สรุป/.test(t)) return "research";
  return "chat";
}

export function liveStatusFor(prompt: string, phase: "start"|"plan"|"act"|"verify"|"recover"|"done"): BossLiveStatus {
  if (phase === "start") return "กำลังอ่านคำขอ";
  if (phase === "plan") return "กำลังวางแผน";
  if (phase === "verify") return "กำลังตรวจสอบผล";
  if (phase === "recover") return "กำลังแก้ไขปัญหา";
  if (phase === "done") return "เรียบร้อย";
  return classifyBossIntent(prompt) === "search" ? "กำลังค้นหา" : "กำลังสร้าง/แก้ไข";
}

export function validateHtmlArtifact(raw: string) {
  const html = /<!doctype html|<html[\s>]/i.test(raw);
  const complete = /<head[\s>][\s\S]*<body[\s>][\s\S]*<\\/body>[\s>][\s\S]*<\\/html>/i.test(raw);
  const suggestions = /```suggestions[\s\S]*\\[[\s\S]*\\][\s\S]*```/i.test(raw);
  const evidence = [html ? "html_detected" : "", complete ? "complete_document_detected" : "", suggestions ? "suggestions_detected" : ""].filter(Boolean);
  return { ok: html && complete, html, complete, suggestions, evidence };
}

export function buildExecutionContract(prompt: string) {
  const intent = classifyBossIntent(prompt);
  return { intent, puterPrimary: true, truthContract: "Never claim an action happened without concrete evidence.", verifyRequired: true, maxRecoveryAttempts: 2, searchUsesLiveWebTool: intent === "search" || intent === "research" };
}