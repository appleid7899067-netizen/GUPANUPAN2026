/**
 * src/lib/sandbox.ts — แซนด์บ็อกซ์สำหรับโค้ดที่ผู้ใช้/AI สร้าง
 *
 * หลักการ: โค้ดของโปรเจกต์ไม่เคยรันบน origin ของบิลเดอร์
 *   - อยู่ใน <iframe sandbox="allow-scripts"> (ไม่มี allow-same-origin → เข้าถึง cookie/localStorage ของบิลเดอร์ไม่ได้)
 *   - CSP ปิดเครือข่าย (connect-src 'none') และบล็อกฟอร์ม/popup/navigation
 *   - สื่อสารกับหน้าหลักผ่าน postMessage ที่ผูกกับ channel สุ่มต่อ session
 *
 * ต่างจาก previewDocument ตรงที่เวอร์ชันนี้เปิด 'unsafe-eval' เพื่อให้ผู้ใช้
 * ทดลองโค้ด (REPL) และสั่งตรวจ DOM ได้ — ยังคงไม่มีสิทธิ์แตะ storage/เครือข่าย
 */

/** สถานะของผลตรวจหนึ่งรายการ */
export type SandboxCheckStatus = "pass" | "warn" | "fail";

export interface SandboxCheck {
  id: string;
  label: string;
  status: SandboxCheckStatus;
  detail: string;
}

/** ข้อมูล DOM ที่เก็บจากในแซนด์บ็อกซ์ (serialize ได้เป็น JSON) */
export interface SandboxSnapshot {
  title: string;
  lang: string | null;
  viewport: string | null;
  textLength: number;
  elements: number;
  headings: number[];
  images: { src: string; hasAlt: boolean }[];
  buttons: { name: string }[];
  links: { name: string; target: string | null; href: string }[];
  fields: { label: string }[];
  ids: string[];
  externalScripts: string[];
  externalStyles: string[];
  counts: { img: number; button: number; a: number; form: number; svg: number };
}

export const SANDBOX_REQUEST_TIMEOUT_MS = 5_000;

/**
 * เก็บ snapshot ของ DOM ปัจจุบัน — ฟังก์ชันนี้ถูกส่งเข้าไปรัน *ใน* iframe
 * (ผ่าน Function.prototype.toString) จึงต้องพึ่งพาแค่ `document` และห้ามอ้างตัวแปรภายนอก
 */
export function collectSnapshot(doc: Document): SandboxSnapshot {
  const list = (selector: string): Element[] => Array.from(doc.querySelectorAll(selector));
  const attr = (el: Element | null, name: string): string | null =>
    el ? el.getAttribute(name) : null;
  const clean = (value: string | null): string =>
    (value || "").replace(/\s+/g, " ").trim();
  const visibleName = (el: Element): string => {
    const named = attr(el, "aria-label") || attr(el, "title") || "";
    const text = clean(el.textContent);
    const img = el.querySelector("img");
    const imgAlt = img ? clean(attr(img, "alt")) : "";
    return clean(named || text || imgAlt).slice(0, 80);
  };
  const labelOf = (el: Element): string => {
    const id = attr(el, "id");
    const explicit = id ? doc.querySelector(`label[for="${id}"]`) : null;
    const wrapped = el.closest ? el.closest("label") : null;
    const named = attr(el, "aria-label") || attr(el, "placeholder") || "";
    return clean(
      (explicit ? explicit.textContent : "") ||
        (wrapped ? wrapped.textContent : "") ||
        named,
    ).slice(0, 80);
  };
  const body = doc.body;

  return {
    title: clean(doc.title),
    lang: attr(doc.documentElement, "lang"),
    viewport: attr(doc.querySelector('meta[name="viewport"]'), "content"),
    textLength: clean(body ? body.textContent : "").length,
    elements: list("*").length,
    headings: list("h1,h2,h3,h4,h5,h6").map((el) =>
      Number(el.tagName.slice(1)),
    ),
    images: list("img").map((el) => ({
      src: clean(attr(el, "src")).slice(0, 120),
      hasAlt: el.hasAttribute("alt"),
    })),
    buttons: list("button,[role=button]").map((el) => ({ name: visibleName(el) })),
    links: list("a[href]").map((el) => ({
      name: visibleName(el),
      target: attr(el, "target"),
      href: clean(attr(el, "href")).slice(0, 120),
    })),
    fields: list("input,select,textarea").map((el) => ({ label: labelOf(el) })),
    ids: list("[id]").map((el) => el.id),
    externalScripts: list("script[src]").map((el) => clean(attr(el, "src")).slice(0, 120)),
    externalStyles: list('link[rel="stylesheet"]').map((el) =>
      clean(attr(el, "href")).slice(0, 120),
    ),
    counts: {
      img: list("img").length,
      button: list("button").length,
      a: list("a").length,
      form: list("form").length,
      svg: list("svg").length,
    },
  };
}

/** รวมผลตรวจเป็นตัวเลขสรุปสำหรับแสดงบน UI */
export function summarizeChecks(checks: SandboxCheck[]) {
  return {
    total: checks.length,
    pass: checks.filter((c) => c.status === "pass").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };
}

function shorten(items: string[], max = 3): string {
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown} และอีก ${items.length - max} รายการ` : shown;
}

/**
 * วิเคราะห์ snapshot → ผลตรวจที่อ่านได้ (ฟังก์ชันบริสุทธิ์ ทดสอบได้โดยไม่ต้องมีเบราว์เซอร์)
 */
export function analyzeSnapshot(s: SandboxSnapshot): SandboxCheck[] {
  const checks: SandboxCheck[] = [];
  const push = (
    id: string,
    label: string,
    status: SandboxCheckStatus,
    detail: string,
  ) => checks.push({ id, label, status, detail });

  // 1) viewport — จำเป็นต่อการแสดงผลบนมือถือ
  if (!s.viewport) {
    push("viewport", "ประกาศ viewport", "fail", "ไม่พบ <meta name=\"viewport\"> หน้าจะย่อผิดบนมือถือ");
  } else if (!/width\s*=\s*device-width/i.test(s.viewport)) {
    push("viewport", "ประกาศ viewport", "warn", `viewport ไม่ได้ตั้ง width=device-width: ${s.viewport}`);
  } else {
    push("viewport", "ประกาศ viewport", "pass", s.viewport);
  }

  // 2) ภาษา
  push(
    "lang",
    "ระบุภาษาของเอกสาร",
    s.lang ? "pass" : "warn",
    s.lang ? `lang="${s.lang}"` : "ไม่พบ lang ที่ <html> — screen reader จะเดาภาษาผิด",
  );

  // 3) title
  if (!s.title) push("title", "ชื่อเรื่อง (title)", "fail", "ไม่มี <title>");
  else if (s.title.length > 70) push("title", "ชื่อเรื่อง (title)", "warn", `ยาว ${s.title.length} ตัวอักษร: ${s.title}`);
  else push("title", "ชื่อเรื่อง (title)", "pass", s.title);

  // 4) โครงสร้างหัวข้อ
  const h1 = s.headings.filter((l) => l === 1).length;
  if (h1 === 0) push("h1", "มี <h1> หนึ่งหัวข้อ", "warn", "ไม่พบ <h1>");
  else if (h1 > 1) push("h1", "มี <h1> หนึ่งหัวข้อ", "warn", `พบ <h1> ${h1} อัน ควรมีอันเดียว`);
  else push("h1", "มี <h1> หนึ่งหัวข้อ", "pass", "พบ 1 อัน");

  const skips: string[] = [];
  for (let i = 1; i < s.headings.length; i++) {
    if (s.headings[i] - s.headings[i - 1] > 1) skips.push(`h${s.headings[i - 1]} → h${s.headings[i]}`);
  }
  push(
    "heading-order",
    "ลำดับหัวข้อต่อเนื่อง",
    skips.length ? "warn" : "pass",
    skips.length ? `ข้ามระดับ: ${shorten(skips)}` : "ลำดับถูกต้อง",
  );

  // 5) รูปที่มีคำอธิบาย
  const noAlt = s.images.filter((i) => !i.hasAlt);
  push(
    "img-alt",
    "รูปมี alt ครบ",
    noAlt.length ? "fail" : "pass",
    noAlt.length
      ? `ขาด alt ${noAlt.length} รูป: ${shorten(noAlt.map((i) => i.src || "(inline)"))}`
      : `รูปทั้งหมด ${s.images.length} รูปมี alt`,
  );

  // 6) ปุ่ม/ลิงก์ที่อ่านออกเสียงได้
  const nameless = [...s.buttons, ...s.links].filter((c) => !c.name);
  push(
    "control-name",
    "ปุ่มและลิงก์มีชื่อ",
    nameless.length ? "fail" : "pass",
    nameless.length ? `ไม่มีชื่อ ${nameless.length} รายการ (เช่นปุ่มไอคอนที่ไม่มี aria-label)` : "ทุกปุ่ม/ลิงก์มีชื่อ",
  );

  // 7) ฟิลด์ในฟอร์ม
  const unlabeled = s.fields.filter((f) => !f.label);
  push(
    "field-label",
    "ช่องกรอกมี label",
    unlabeled.length ? "warn" : "pass",
    unlabeled.length ? `ไม่มี label ${unlabeled.length} ช่อง` : `ช่องกรอก ${s.fields.length} ช่องมี label/aria-label`,
  );

  // 8) id ซ้ำ
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of s.ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  push(
    "duplicate-id",
    "id ไม่ซ้ำกัน",
    dupes.size ? "warn" : "pass",
    dupes.size ? `id ซ้ำ: ${shorten([...dupes])}` : `${s.ids.length} id ไม่ซ้ำ`,
  );

  // 9) ทรัพยากรภายนอก (ถูก CSP บล็อกใน Preview/Sandbox)
  const external = [...s.externalScripts, ...s.externalStyles];
  push(
    "external-assets",
    "ไม่พึ่งไฟล์ภายนอก",
    external.length ? "fail" : "pass",
    external.length
      ? `โหลดจากภายนอก ${external.length} ไฟล์ (จะไม่ทำงานใน Preview): ${shorten(external)}`
      : "ทุกอย่างอยู่ในเอกสารเดียว",
  );

  // 10) ลิงก์เปิดแท็บใหม่ / นำทาง
  const blanks = s.links.filter((l) => l.target === "_blank");
  push(
    "no-popup",
    "ไม่เปิดแท็บใหม่",
    blanks.length ? "warn" : "pass",
    blanks.length ? `มี target="_blank" ${blanks.length} ลิงก์ (ถูกบล็อกในแซนด์บ็อกซ์)` : "ไม่มี target=\"_blank\"",
  );

  // 11) ปริมาณเนื้อหา — ใช้เตือนโปรเจกต์ที่ยังว่าง
  const counts = s.counts;
  push(
    "content",
    "มีเนื้อหาให้ตรวจ",
    s.textLength < 40 ? "warn" : "pass",
    `${s.elements} element · ข้อความ ${s.textLength.toLocaleString("th-TH")} ตัวอักษร · รูป ${counts.img} · ปุ่ม ${counts.button} · ลิงก์ ${counts.a} · ฟอร์ม ${counts.form} · SVG ${counts.svg}`,
  );

  return checks;
}

/** ประโยคสรุปสำหรับวางเหนือรายการผลตรวจ */
export function checksHeadline(checks: SandboxCheck[]): string {
  const { pass, warn, fail } = summarizeChecks(checks);
  if (fail) return `พบปัญหาที่ควรแก้ ${fail} รายการ · ผ่าน ${pass} · เตือน ${warn}`;
  if (warn) return `ไม่มีปัญหาบล็อก แต่มีข้อควรปรับ ${warn} รายการ · ผ่าน ${pass}`;
  return `ผ่านทุกข้อ (${pass}/${checks.length})`;
}

/**
 * รหัส JS ที่รันอยู่ในแซนด์บ็อกซ์: ดัก console/error, ตอบคำสั่ง eval และ snapshot
 * (ไม่รวมแท็ก <script> เพื่อให้ทดสอบใน VM ได้ตรง ๆ)
 */
export function sandboxRuntimeBody(channel: string): string {
  const ch = JSON.stringify(channel);
  const collector = collectSnapshot.toString();
  return `(function(){
var CH=${ch};
function send(msg){ try{ parent.postMessage(Object.assign({channel:CH},msg),"*"); }catch(e){} }
function serialize(v){
  if (v===undefined) return "undefined";
  if (v===null) return "null";
  var t=typeof v;
  if (t==="string") return v;
  if (t==="number"||t==="boolean"||t==="bigint") return String(v);
  if (t==="function") return "[function "+(v.name||"anonymous")+"]";
  if (v instanceof Element) return "<"+v.tagName.toLowerCase()+(v.id?"#"+v.id:"")+">";
  if (typeof NodeList!=="undefined"&&v instanceof NodeList) return Array.prototype.slice.call(v,0,20).map(serialize).join(", ");
  if (Array.isArray(v)) return v.slice(0,20).map(serialize).join(", ");
  try{
    var s=JSON.stringify(v);
    if (s===undefined) return String(v);
    return s.length>2000? s.slice(0,2000)+"…" : s;
  }catch(e){ return String(v); }
}
["log","warn","error"].forEach(function(level){
  var original=console[level];
  console[level]=function(){
    var args=Array.prototype.slice.call(arguments);
    send({level:level,text:args.map(function(a){ try{ return typeof a==="string"?a:serialize(a); }catch(e){ return String(a); } }).join(" ").slice(0,2000)});
    original.apply(console,arguments);
  };
});
addEventListener("error",function(e){ send({level:"error",text:String(e.message)}); });
addEventListener("unhandledrejection",function(e){ send({level:"error",text:String(e.reason)}); });
addEventListener("message",function(event){
  var data=event.data;
  if(!data||data.channel!==CH||!data.type) return;
  if(data.type==="eval"){
    var id=data.id;
    var AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
    Promise.resolve()
      .then(function(){ return new AsyncFunction("return ("+data.code+"\\n)")(); })
      .catch(function(){ return new AsyncFunction(data.code)(); })
      .then(function(value){ send({type:"result",id:id,ok:true,text:serialize(value)}); })
      .catch(function(err){ send({type:"result",id:id,ok:false,text:String((err&&err.message)||err)}); });
  } else if(data.type==="snapshot"){
    var collect=${collector};
    var payload;
    try{ payload=collect(document); }catch(err){ payload={error:String((err&&err.message)||err)}; }
    send({type:"snapshot",id:data.id,data:payload});
  }
});
send({type:"ready"});
})();`;
}

/** แท็กสคริปต์พร้อมใช้ ฝังลงในเอกสารแซนด์บ็อกซ์ */
export function sandboxRuntimeSource(channel: string): string {
  return `<script>${sandboxRuntimeBody(channel)}<\/script>`;
}

/** เอกสาร HTML ที่ปลอดภัยสำหรับรันโค้ดผู้ใช้ พร้อมความสามารถทดลอง/ตรวจสอบ */
export function sandboxDocument(html: string, channel: string): string {
  // CSP มาก่อนโค้ดผู้ใช้เสมอ: ไม่มีเครือข่าย ไม่มี same-origin — เปิดเฉพาะ eval สำหรับ REPL
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: https:; media-src data: https:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">`;
  const runtime = sandboxRuntimeSource(channel);
  return `<!doctype html><html><head>${policy}<title>Sandbox</title>${runtime}</head><body>${html.replace(/<!doctype[^>]*>/i, "")}</body></html>`;
}

/* ------------------------------------------------------------------ */
/* ฝั่งหน้าหลัก: ส่งคำขอเข้าแซนด์บ็อกซ์และรอผล                          */
/* ------------------------------------------------------------------ */

export interface SandboxReply {
  ok: boolean;
  text: string;
  /** มีค่าเมื่อเป็นคำตอบของ snapshot */
  data?: SandboxSnapshot;
}

interface Pending {
  resolve: (reply: SandboxReply) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** ตัวจัดการคำขอแบบ request/response ผูกกับ channel เดียว */
export function createSandboxClient(
  getFrame: () => HTMLIFrameElement | null,
  channel: string,
) {
  const pending = new Map<string, Pending>();

  function receive(event: MessageEvent): void {
    const data = event.data;
    if (!data || data.channel !== channel) return;
    if (typeof data.id !== "string") return;
    const entry = pending.get(data.id);
    if (!entry) return;
    if (data.type === "result") {
      clearTimeout(entry.timer);
      pending.delete(data.id);
      entry.resolve({ ok: !!data.ok, text: String(data.text ?? "") });
    } else if (data.type === "snapshot") {
      clearTimeout(entry.timer);
      pending.delete(data.id);
      const snapshot = data.data as SandboxSnapshot | { error?: string } | undefined;
      const error = snapshot && "error" in snapshot ? String(snapshot.error ?? "") : "";
      entry.resolve({
        ok: !error,
        text: error,
        data: error ? undefined : (snapshot as SandboxSnapshot),
      });
    }
  }

  function request(payload: Record<string, unknown>, timeoutMs = SANDBOX_REQUEST_TIMEOUT_MS) {
    const frame = getFrame();
    const id = crypto.randomUUID();
    return new Promise<SandboxReply>((resolve) => {
      if (!frame?.contentWindow) {
        resolve({ ok: false, text: "ยังไม่ได้โหลดแซนด์บ็อกซ์" });
        return;
      }
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ ok: false, text: "แซนด์บ็อกซ์ไม่ตอบภายในเวลาที่กำหนด" });
      }, timeoutMs);
      pending.set(id, { resolve, timer });
      frame.contentWindow.postMessage({ channel, id, ...payload }, "*");
    });
  }

  return {
    receive,
    /** รันโค้ด JS ในแซนด์บ็อกซ์ (มีค่าใช้จ่ายเป็นศูนย์, ไม่แตะข้อมูลบิลเดอร์) */
    evalCode: (code: string) => request({ type: "eval", code }),
    /** ขอข้อมูล DOM เพื่อนำไปวิเคราะห์ */
    snapshot: (timeoutMs?: number) =>
      request({ type: "snapshot" }, timeoutMs) as Promise<SandboxReply & { data?: SandboxSnapshot }>,
    dispose() {
      for (const [, entry] of pending) clearTimeout(entry.timer);
      pending.clear();
    },
  };
}
