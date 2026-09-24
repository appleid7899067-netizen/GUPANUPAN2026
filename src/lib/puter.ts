/** Puter.js foundation — auth + model routing. */

import { DEFAULT_FREE_MODEL, FREE_MODELS, BOSS_MODEL_POOL, type ModelOption } from "@/lib/brand";

const SCRIPT_SRC = "https://js.puter.com/v2/";

export type PuterUser = { uuid?: string; username?: string; email?: string; [key: string]: unknown };
export type PuterModel = { id: string; provider?: string; name?: string; aliases?: string[]; context?: number; max_tokens?: number; cost?: unknown };
export type PuterAPI = {
  auth: { isSignedIn: () => boolean | Promise<boolean>; signIn: (opts?: { attempt_temp_user_creation?: boolean }) => Promise<PuterUser | void>; signOut: () => Promise<void>; getUser: () => Promise<PuterUser | null> };
  ai: { chat: (messages: Array<{ role: string; content: string }> | string, options?: { model?: string; stream?: boolean; tools?: unknown[]; compaction?: boolean; normalize?: boolean }) => Promise<unknown> | AsyncIterable<unknown>; listModels?: () => Promise<PuterModel[]> };
  fs?: unknown; hosting?: unknown;
};

declare global { interface Window { puter?: PuterAPI } }
const isBrowser = () => typeof window !== "undefined";
export function getPuter(): PuterAPI | null { return isBrowser() ? window.puter ?? null : null; }
export function loadPuter(): Promise<PuterAPI> {
  if (!isBrowser()) return Promise.reject(new Error("Puter runs in the browser only."));
  if (window.puter) return Promise.resolve(window.puter);
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (existing) return new Promise((resolve,reject)=>{ const start=Date.now(); const tick=()=>{ if(window.puter)return resolve(window.puter); if(Date.now()-start>12000)return reject(new Error("Puter.js loaded but did not initialize.")); requestAnimationFrame(tick); }; existing.addEventListener("error",()=>reject(new Error("Failed to load Puter.js."))); tick(); });
  return new Promise((resolve,reject)=>{ const script=document.createElement("script"); script.src=SCRIPT_SRC; script.async=true; script.onload=()=>{ const start=Date.now(); const tick=()=>{ if(window.puter)return resolve(window.puter); if(Date.now()-start>8000)return reject(new Error("Puter.js loaded but did not initialize.")); requestAnimationFrame(tick); }; tick(); }; script.onerror=()=>reject(new Error("Failed to load Puter.js.")); document.head.appendChild(script); });
}
export async function ensurePuter(): Promise<PuterAPI> { return getPuter() ?? loadPuter(); }
export async function puterSignIn(): Promise<PuterUser | null> { const puter=await ensurePuter(); await puter.auth.signIn({attempt_temp_user_creation:true}); return puter.auth.getUser(); }
export async function puterSignOut(): Promise<void> { const puter=await ensurePuter(); await puter.auth.signOut(); }
export async function puterIsSignedIn(): Promise<boolean> { try { const puter=await ensurePuter(); const v=puter.auth.isSignedIn(); return typeof v==="boolean"?v:await v; } catch { return false; } }
export async function puterGetUser(): Promise<PuterUser | null> { try { const puter=await ensurePuter(); if(!(await puterIsSignedIn()))return null; return puter.auth.getUser(); } catch { return null; } }
export async function puterListModels(): Promise<PuterModel[]> { const puter=await ensurePuter(); if(!puter.ai.listModels)return []; try{return await puter.ai.listModels();}catch{return[];} }

function normalizeMessages(messages:Array<{role:string;content:string}>){return messages.map(m=>({role:m.role==="assistant"?"assistant" as const:"user" as const,content:typeof m.content==="string"?m.content:String(m.content??"")})).filter(m=>m.content.trim());}
function isInvalidModelError(message:string){return /model.*(not found|invalid|unavailable)|unknown model|unsupported model/i.test(message);}
export function extractPuterText(response:unknown):string{if(response==null)return"";if(typeof response==="string")return response;if(typeof Element!=="undefined"&&response instanceof Element)return(response.textContent??response.getAttribute("data-text")??"").trim();if(typeof response==="object"){const r=response as Record<string,unknown>;if(typeof r.message==="string")return r.message;if(r.message&&typeof r.message==="object"){const m=r.message as Record<string,unknown>;if(typeof m.content==="string")return m.content;if(Array.isArray(m.content))return m.content.map(item=>{if(typeof item==="string")return item;if(typeof Element!=="undefined"&&item instanceof Element)return item.textContent??"";const part=item as {text?:unknown;content?:unknown};return typeof part.text==="string"?part.text:typeof part.content==="string"?part.content:"";}).join("");}if(typeof r.text==="string")return r.text;if(typeof r.content==="string")return r.content;}try{const json=JSON.stringify(response);return json==="{}"?"":json;}catch{return"";}}

function catalogCost(model:PuterModel):number {
  const c=model.cost as any;
  if(typeof c==="number")return c;
  if(c && typeof c==="object"){const input=Number(c.input ?? c.input_cost ?? c.prompt ?? 0);const output=Number(c.output ?? c.output_cost ?? c.completion ?? 0);return (Number.isFinite(input)?input:0)+(Number.isFinite(output)?output:0);}
  return Number.POSITIVE_INFINITY;
}

function scoreCandidate(model:PuterModel, preferred:string):number {
  const exact=model.id===preferred ? 100000 : 0;
  const catalogCostScore=Number.isFinite(catalogCost(model)) ? Math.max(0,1000-catalogCost(model)) : 0;
  return exact+catalogCostScore;
}

export async function resolveBossModel(preferred?:string):Promise<string>{
  const catalog=await puterListModels();
  const poolIds=new Set(BOSS_MODEL_POOL.map(m=>m.id));
  const requested=preferred && poolIds.has(preferred)?preferred:undefined;
  if(requested && catalog.some(m=>m.id===requested))return requested;
  if(catalog.length){
    const poolMatches=catalog.filter(m=>poolIds.has(m.id));
    if(poolMatches.length){return [...poolMatches].sort((a,b)=>scoreCandidate(b,requested??DEFAULT_FREE_MODEL)-scoreCandidate(a,requested??DEFAULT_FREE_MODEL))[0]!.id;}
  }
  return requested ?? DEFAULT_FREE_MODEL;
}

export async function puterFreeChat(messages:Array<{role:string;content:string}>,opts?:{model?:string;onDelta?:(text:string)=>void;webSearch?:boolean}):Promise<{ok:boolean;text:string;model?:string;error?:string}>{
  const puter=await ensurePuter(); if(!(await puterIsSignedIn()))return{ok:false,text:"",error:"PUTER_SIGN_IN_REQUIRED"};
  const requested=await resolveBossModel(opts?.model);
  const fallbackOrder=[requested,...FREE_MODELS,"openai/gpt-oss-120b","gpt-5.6-luna","gpt-5-nano"].filter(Boolean);
  const unique=[...new Set(fallbackOrder)]; let lastError="";
  for(const model of unique){try{const safeMessages=normalizeMessages(messages);const response=await puter.ai.chat(safeMessages,{model,stream:true,compaction:true,normalize:true,...(opts?.webSearch?{tools:[{type:"web_search"}]}:{})});if(response&&typeof(response as AsyncIterable<unknown>)[Symbol.asyncIterator]==="function"){let full="";for await(const part of response as AsyncIterable<Record<string,unknown>>){if(part?.type==="error")throw new Error(String(part.message??"Puter stream error"));const delta=typeof part?.text==="string"?part.text:extractPuterText(part);if(delta){full+=delta;opts?.onDelta?.(full);}}if(full.trim())return{ok:true,text:full,model};lastError="Empty streaming response from "+model;}else{const text=extractPuterText(response);if(text.trim()){opts?.onDelta?.(text);return{ok:true,text,model};}lastError="Empty response from "+model;}}catch(e){lastError=e instanceof Error?e.message:String(e);if(/no usage left|insufficient_funds|quota|402/i.test(lastError))break;if(isInvalidModelError(lastError))continue;}}
  return{ok:false,text:"",error:lastError||"All Puter models failed"};
}
export { DEFAULT_FREE_MODEL, FREE_MODELS };
