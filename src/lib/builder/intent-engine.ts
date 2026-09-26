/**
 * GUPANUPAN CORE — Intent Engine
 * Beyond Grok: model owns ProjectStore behavior, not just UI patches.
 * User says a need → engine solves the WHY with chained operations + nextPredict.
 */

import type { CanvasPatch, CanvasState, IntentResult } from "./types";

const INTENT_SYSTEM = `You are GUPANUPAN CORE, not a chatbot.
You own the ProjectStore.

You have 3 layers:
LAYER 1 - HEART: current appSchema, routeStack, chatHistory
LAYER 2 - BRAIN: user goal inferred (the WHY)
LAYER 3 - HANDS: operations only (never HTML/CSS)

RULES:
- Never output HTML, CSS, JSX, or markdown fences.
- Think in Thai about the user's real goal, but output JSON only.
- If user says "X", ask yourself "ทำไมเขาถึงอยากได้ X" then solve the WHY, not only X.
- For a NEW APP or full app generation, emit 4–8 operations and make each addPage contain a complete, polished component set (hero, nav, sections, cards, CTA, footer where appropriate). Do not stop at 2–3 buttons.
- For a small edit, emit only the operations needed.
- Predict the next route the user will open and list it in nextPredict.preload.
- Prefer practical component types: hero, heading, text, button, card, metric, badge, input, list, nav, banner, form, image, tabs, avatar, divider.

Allowed operations:
1) {"op":"addComponent","pageId":string,"at"?:number,"component":{"id":string,"type":string,"props"?:object,"children"?:[]}}
2) {"op":"updateComponent","pageId":string,"componentId":string,"props":object}
3) {"op":"removeComponent","pageId":string,"componentId":string}
4) {"op":"addPage","page":{"id":string,"title":string,"path":string,"components":[]}}
5) {"op":"updateTheme","theme":{[key:string]:string}}
6) {"op":"pushRoute","pageId":string}
7) {"op":"setPage","pageId":string}
8) {"op":"preload","pageIds":string[]}

DESIGN TEMPLATES — choose one coherent visual direction for each new app:
- modern-saas: violet/indigo, soft surfaces, rounded cards, strong CTA
- ai-studio: violet/cyan accents, dark or misty surfaces, hero + metrics
- ecommerce: warm/high-contrast, product cards, price/CTA hierarchy
- creator: pink/coral/lilac, editorial cards, bold hero
- finance: emerald/blue, restrained surfaces, metrics and data cards
- travel: sky/teal/sand, spacious hero, image-led cards
- education: blue/purple, friendly cards, progress/lesson blocks
- fitness: lime/coral/dark, energetic metrics and CTA
- portfolio: editorial neutrals with one strong accent
- dark-pro: charcoal, violet, high contrast, glass-like surfaces

Never default a newly generated app to plain black/white or grayscale. Use updateTheme to establish background, text, primary, accent, surface, and muted colors together. Keep one palette across all pages.

OUTPUT FORMAT ONLY (single JSON object, no text outside):
{
  "thought": "ผู้ใช้ต้องการ… (ทำไม)",
  "operations": [ /* 4-8 ops for a new app; fewer for a small edit */ ],
  "nextPredict": { "preload": ["pageId", "..."] },
  "reply": "ข้อความสั้นภาษาไทยอธิบายว่าทำอะไรให้แล้ว"
}`;

export function intentSystemPrompt(): string {
  return INTENT_SYSTEM;
}

/** Extract first balanced { ... } from mixed model text. */
export function extractBalancedObject(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

const ALLOWED_OPS = new Set([
  "addComponent",
  "updateComponent",
  "removeComponent",
  "addPage",
  "updateTheme",
  "pushRoute",
  "setPage",
  "preload",
]);

function isPatch(p: unknown): p is CanvasPatch {
  if (!p || typeof p !== "object") return false;
  const op = (p as { op?: string }).op;
  return typeof op === "string" && ALLOWED_OPS.has(op);
}

/** Parse IntentResult from model output (resilient). */
export function parseIntentResult(raw: string): IntentResult | null {
  if (!raw || typeof raw !== "string") return null;
  const candidates: string[] = [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const balanced = extractBalancedObject(raw);
  if (balanced) candidates.push(balanced);
  const arrayStart = raw.indexOf("[");
  const arrayEnd = raw.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(raw.slice(arrayStart, arrayEnd + 1).trim());
  candidates.push(raw.trim());

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") continue;

      // Full intent shape
      if (Array.isArray(parsed.operations)) {
        const operations = parsed.operations.filter(isPatch);
        if (!operations.length) continue;
        return {
          thought: String(parsed.thought ?? ""),
          operations,
          nextPredict:
            parsed.nextPredict && typeof parsed.nextPredict === "object"
              ? {
                  preload: Array.isArray((parsed.nextPredict as { preload?: unknown }).preload)
                    ? ((parsed.nextPredict as { preload: unknown[] }).preload.filter(
                        (x) => typeof x === "string",
                      ) as string[])
                    : undefined,
                }
              : undefined,
          reply: String(parsed.reply ?? "อัปเดตแอปแล้ว"),
        };
      }

      // Legacy: bare array of patches
      if (Array.isArray(parsed)) {
        const operations = (parsed as unknown[]).filter(isPatch);
        if (operations.length) {
          return {
            thought: "",
            operations,
            reply: `อัปเดต ${operations.length} รายการ`,
          };
        }
      }

      // Legacy wrapper { patches: [...] }
      if (Array.isArray(parsed.patches)) {
        const operations = parsed.patches.filter(isPatch);
        if (operations.length) {
          return {
            thought: String(parsed.thought ?? ""),
            operations,
            reply: String(parsed.reply ?? `อัปเดต ${operations.length} รายการ`),
          };
        }
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Local Thai goal heuristics — when the remote model fails or is slow,
 * still convert messy goals into multi-op intent (beyond Grok single patch).
 */
export function localIntentFromGoal(
  goal: string,
  state: CanvasState,
): IntentResult | null {
  const t = goal.trim().toLowerCase();
  if (!t) return null;

  const homeId =
    state.stack?.[state.stack.length - 1]?.id ||
    Object.keys(state.pages || {})[0] ||
    "home";
  const page = state.pages?.[homeId];
  if (!page) return null;

  // Conversion / sales urgency
  if (/ขายดี|ยอดขาย|conversion|ซื้อเยอะ|เร่งยอด|ปิดการขาย|cta/.test(t)) {
    const bannerId = uid("banner");
    const ctaId = uid("cta");
    return {
      thought:
        "ผู้ใช้ต้องการเพิ่มยอดขาย ไม่ใช่แค่เปลี่ยนสี — ต้องสร้างความเร่งด่วน + CTA ชัด + เตรียมทางไป checkout",
      operations: [
        {
          op: "updateTheme",
          theme: { primary: "#FF3B30", accent: "#FF3B30" },
        },
        {
          op: "addComponent",
          pageId: homeId,
          at: 0,
          component: {
            id: bannerId,
            type: "banner",
            props: {
              text: "ด่วน! เหลือจำนวนจำกัด — สั่งเลยวันนี้",
              tone: "urgency",
            },
          },
        },
        {
          op: "addComponent",
          pageId: homeId,
          component: {
            id: ctaId,
            type: "button",
            props: {
              text: "สั่งซื้อเลย",
              route: "checkout",
              pulse: true,
              variant: "primary",
            },
          },
        },
        {
          op: "addPage",
          page: {
            id: "checkout",
            title: "Checkout",
            path: "/checkout",
            components: [
              {
                id: uid("co-h"),
                type: "heading",
                props: { text: "ยืนยันคำสั่งซื้อ" },
              },
              {
                id: uid("co-btn"),
                type: "button",
                props: { text: "ชำระเงิน", route: "home" },
              },
            ],
          },
        },
        { op: "preload", pageIds: ["checkout"] },
      ],
      nextPredict: { preload: ["checkout"] },
      reply: "จัดให้แล้ว — แบนเนอร์เร่งด่วน + CTA แดง + เตรียมหน้า checkout ไว้ล่วงหน้า",
    };
  }

  // Dark / look premium
  if (/มืด|dark|พรีเมียม|หรู|ดำ/.test(t)) {
    return {
      thought: "ผู้ใช้ต้องการความรู้สึกพรีเมียม/โหมดมืด ไม่ใช่แค่พื้นหลังดำ",
      operations: [
        {
          op: "updateTheme",
          theme: {
            background: "#0a0a0a",
            text: "#f5f5f5",
            primary: "#a78bfa",
            surface: "#171717",
          },
        },
        {
          op: "addComponent",
          pageId: homeId,
          at: 0,
          component: {
            id: uid("prem"),
            type: "heading",
            props: { text: "Experience elevated" },
          },
        },
      ],
      nextPredict: { preload: Object.keys(state.pages).slice(0, 2) },
      reply: "ปรับโทนมืดพรีเมียม + หัวข้อใหม่ให้แล้ว",
    };
  }

  // Add contact / form
  if (/ติดต่อ|contact|ฟอร์ม|form|สอบถาม/.test(t)) {
    return {
      thought: "ผู้ใช้ต้องการช่องทางติดต่อที่ใช้ได้จริง",
      operations: [
        {
          op: "addPage",
          page: {
            id: "contact",
            title: "ติดต่อ",
            path: "/contact",
            components: [
              {
                id: uid("ch"),
                type: "heading",
                props: { text: "ติดต่อเรา" },
              },
              {
                id: uid("ci"),
                type: "input",
                props: { placeholder: "อีเมลของคุณ" },
              },
              {
                id: uid("cb"),
                type: "button",
                props: { text: "ส่งข้อความ", route: "home" },
              },
            ],
          },
        },
        {
          op: "addComponent",
          pageId: homeId,
          component: {
            id: uid("nav-c"),
            type: "button",
            props: { text: "ติดต่อ", route: "contact" },
          },
        },
        { op: "preload", pageIds: ["contact"] },
      ],
      nextPredict: { preload: ["contact"] },
      reply: "เพิ่มหน้าติดต่อ + ปุ่มจากหน้าแรก + preload แล้ว",
    };
  }

  // Full app creation fallback: never leave a new app as a sparse black/white wireframe.
  if (/สร้าง(?:แอพ|เว็บ|เว็บไซต์)|ทำ(?:แอพ|เว็บ|เว็บไซต์)|build|create|landing|ร้าน|shop|portfolio|dashboard|ระบบ/.test(t)) {
    const domain =
      /ร้าน|shop|ขาย|สินค้า|ecommerce/.test(t) ? "ecommerce" :
      /ฟิต|fitness|ออกกำลัง/.test(t) ? "fitness" :
      /เรียน|การศึกษา|course|education/.test(t) ? "education" :
      /ท่องเที่ยว|travel|โรงแรม|เที่ยว/.test(t) ? "travel" :
      /การเงิน|finance|ลงทุน/.test(t) ? "finance" :
      /ai|เอไอ|studio/.test(t) ? "ai-studio" : "modern-saas";
    const palettes: Record<string, Record<string,string>> = {
      ecommerce: { background:"#fff7ed", text:"#241a14", primary:"#ea580c", accent:"#f59e0b", surface:"#ffffff", muted:"#78716c" },
      fitness: { background:"#111827", text:"#f9fafb", primary:"#84cc16", accent:"#fb7185", surface:"#1f2937", muted:"#9ca3af" },
      education: { background:"#f5f3ff", text:"#1f2340", primary:"#6366f1", accent:"#06b6d4", surface:"#ffffff", muted:"#64748b" },
      travel: { background:"#f0fdfa", text:"#12313a", primary:"#0d9488", accent:"#f59e0b", surface:"#ffffff", muted:"#64748b" },
      finance: { background:"#f0fdf4", text:"#10251a", primary:"#059669", accent:"#2563eb", surface:"#ffffff", muted:"#64748b" },
      "ai-studio": { background:"#0f1020", text:"#f8fafc", primary:"#8b5cf6", accent:"#22d3ee", surface:"#181a2f", muted:"#a5b4fc" },
      "modern-saas": { background:"#f7f5ff", text:"#1e1b4b", primary:"#6d5dfc", accent:"#06b6d4", surface:"#ffffff", muted:"#667085" },
    };
    const theme = palettes[domain];
    const ids = {
      features:"features", pricing:"pricing", contact:"contact"
    };
    return {
      thought: "สร้างเป็นแอปเต็มรูปแบบตามโดเมน ไม่ใช่ wireframe: มีธีม, navigation, hero, content sections, cards, CTA และหน้ารอง",
      operations: [
        { op:"updateTheme", theme },
        { op:"addComponent", pageId:homeId, at:0, component:{ id:uid("nav"), type:"nav", props:{ text:"หน้าแรก | คุณสมบัติ | ราคา | ติดต่อ", route:"features" } } },
        { op:"addComponent", pageId:homeId, component:{ id:uid("hero"), type:"hero", props:{ badge:domain, text: page.title || "สร้างสิ่งที่คนอยากใช้", subtitle:"ประสบการณ์ครบในที่เดียว พร้อมเริ่มใช้งานได้ทันที", cta:"เริ่มใช้งาน", route:"contact" } } },
        { op:"addComponent", pageId:homeId, component:{ id:uid("features"), type:"card", props:{ title:"ทุกอย่างที่ต้องการ", text:"ฟีเจอร์หลักถูกจัดเป็นระบบ ใช้งานง่าย และต่อยอดได้" } } },
        { op:"addComponent", pageId:homeId, component:{ id:uid("metrics"), type:"metric", props:{ label:"ผู้ใช้งาน", value:"10K+", delta:"เติบโตต่อเนื่อง" } } },
        { op:"addComponent", pageId:homeId, component:{ id:uid("cta"), type:"button", props:{ text:"เริ่มต้นตอนนี้", route:"contact", variant:"primary" } } },
        { op:"addPage", page:{ id:ids.features, title:"คุณสมบัติ", path:"/features", components:[
          {id:uid("fh"),type:"heading",props:{text:"คุณสมบัติทั้งหมด"}},
          {id:uid("fc1"),type:"card",props:{title:"เร็วและใช้ง่าย",text:"ออกแบบมาให้เริ่มต้นได้ทันที"}},
          {id:uid("fc2"),type:"card",props:{title:"สวยและยืดหยุ่น",text:"ปรับแต่งสี เนื้อหา และโครงสร้างได้"}},
          {id:uid("fc3"),type:"card",props:{title:"พร้อมเติบโต",text:"วางโครงสร้างสำหรับฟีเจอร์ในอนาคต"}}
        ]}},
        { op:"addPage", page:{ id:ids.contact, title:"เริ่มต้น", path:"/contact", components:[
          {id:uid("ch"),type:"heading",props:{text:"เริ่มต้นใช้งาน"}},
          {id:uid("ct"),type:"text",props:{text:"กรอกข้อมูลเพื่อเริ่มต้นโปรเจกต์ของคุณ"}},
          {id:uid("ci"),type:"input",props:{placeholder:"อีเมลของคุณ"}},
          {id:uid("cb"),type:"button",props:{text:"ส่งข้อมูล",route:"home",variant:"primary"}}
        ]}},
        { op:"preload", pageIds:[ids.features,ids.contact] }
      ],
      nextPredict:{preload:[ids.features,ids.contact]},
      reply:"สร้างโครงแอปเต็มให้แล้ว: ธีม + navigation + hero + sections + cards + CTA + หน้ารอง",
    };
  }

  // Generic improve / จัดให้
  if (/สวย|ดีขึ้น|ปรับ|improve|จัดให้|ทำให้ดี/.test(t)) {
    return {
      thought: "ผู้ใช้ต้องการคุณภาพโดยรวมดีขึ้น — จัดโครงสร้างหน้าแรกให้ชัด",
      operations: [
        {
          op: "updateTheme",
          theme: { primary: "#7c5cff" },
        },
        {
          op: "addComponent",
          pageId: homeId,
          at: 0,
          component: {
            id: uid("hero"),
            type: "heading",
            props: { text: page.title || "ยินดีต้อนรับ" },
          },
        },
        {
          op: "addComponent",
          pageId: homeId,
          component: {
            id: uid("sub"),
            type: "text",
            props: { text: "พร้อมใช้งาน — บอกได้เลยว่าจะปรับจุดไหนต่อ" },
          },
        },
      ],
      nextPredict: { preload: Object.keys(state.pages).slice(0, 3) },
      reply: "จัดโครงหน้าแรก + โทนสีหลักใหม่ให้แล้ว",
    };
  }


  // Generic fallback: every non-empty request must remain actionable.
  // Do not turn an unrecognized natural-language request into a hard Intent failure.
  return {
    thought: "แปลงคำขอเป็น Intent แบบปลอดภัยเพื่อให้ Canvas เดินหน้าต่อได้",
    operations: [
      {
        op: "addComponent",
        pageId: homeId,
        component: {
          id: uid("intent"),
          type: "text",
          props: { text: goal.trim().slice(0, 240) },
        },
      },
    ],
    nextPredict: { preload: Object.keys(state.pages).slice(0, 3) },
    reply: "รับคำขอแล้ว และส่งต่อเป็น Intent ให้ Canvas เรียบร้อย",
  };


  return null;
}

export function buildIntentUserPayload(
  state: CanvasState,
  userMessage: string,
  history: { role: string; content: string }[],
): string {
  return JSON.stringify({
    appSchema: {
      pages: state.pages,
      stack: state.stack,
      theme: state.theme,
      preloaded: state.preloaded ?? [],
    },
    currentRoute: state.stack?.[state.stack.length - 1]?.id ?? "home",
    lastChat: history.slice(-5),
    userMessage,
  });
}
