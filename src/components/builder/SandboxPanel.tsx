"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Eraser,
  FlaskConical,
  Info,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import {
  analyzeSnapshot,
  checksHeadline,
  createSandboxClient,
  sandboxDocument,
  summarizeChecks,
  type SandboxCheck,
} from "@/lib/sandbox";

type Line = { level: "log" | "warn" | "error" | "info"; text: string };
type PanelTab = "console" | "repl" | "checks";
type Attempt = { code: string; ok: boolean; text: string };

/** คำสั่งสำเร็จรูปสำหรับทดลองในแซนด์บ็อกซ์ (กดแล้วรันทันที) */
const QUICK_RUNS: { label: string; code: string }[] = [
  { label: "นับ element", code: "document.querySelectorAll('*').length" },
  { label: "ชื่อเรื่อง", code: "document.title" },
  {
    label: "ปุ่มทั้งหมด",
    code: "[...document.querySelectorAll('button')].map(b => b.textContent.trim())",
  },
  { label: "ลองใช้ localStorage", code: "localStorage.length" },
  {
    label: "ลองยิงเครือข่าย",
    code: "fetch('https://example.com').then(r => r.status)",
  },
];

const MAX_LINES = 200;
const MAX_ATTEMPTS = 20;

/**
 * SandboxPanel — รันโค้ดของโปรเจกต์ใน iframe แยก พร้อมคอนโซล REPL และตัวตรวจ DOM
 * ทุกอย่างอยู่ในเบราว์เซอร์: ไม่มีคำขอออกเครือข่าย ไม่แตะ storage ของบิลเดอร์
 */
export default function SandboxPanel({ html }: { html: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [channel] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sandbox-${Date.now()}`,
  );
  const client = useMemo(
    () => createSandboxClient(() => frame.current, channel),
    [channel],
  );

  const [lines, setLines] = useState<Line[]>([]);
  const [tab, setTab] = useState<PanelTab>("console");
  const [code, setCode] = useState("document.title");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [checks, setChecks] = useState<SandboxCheck[] | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const checksRun = useRef(0);

  const srcDoc = useMemo(
    () => sandboxDocument(html, channel),
    // reloadKey ทำให้เอกสารถูกสร้างใหม่เมื่อผู้ใช้กดโหลดซ้ำ
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [html, channel, reloadKey],
  );

  const append = useCallback((line: Line) => {
    setLines((old) => [...old.slice(-(MAX_LINES - 1)), line]);
  }, []);

  const runChecks = useCallback(async () => {
    setBusy(true);
    const reply = await client.snapshot();
    if (!reply.ok || !reply.data) {
      setChecks(null);
      append({ level: "error", text: `ตรวจไม่สำเร็จ: ${reply.text || "ไม่ได้รับข้อมูล DOM"}` });
    } else {
      setChecks(analyzeSnapshot(reply.data));
      checksRun.current += 1;
    }
    setBusy(false);
  }, [client, append]);

  // รับข้อความจากแซนด์บ็อกซ์: คอนโซล, สถานะพร้อมใช้, และคำตอบของ REPL
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.channel !== channel) return;

      if (data.type === "ready") {
        setReady(true);
        setLines([
          { level: "info", text: "แซนด์บ็อกซ์พร้อม · โค้ดรันใน iframe แยก ไม่มีสิทธิ์แตะข้อมูลบิลเดอร์" },
        ]);
        void runChecks();
        return;
      }
      client.receive(event);
      if (typeof data.level === "string" && typeof data.text === "string") {
        const level = ["log", "warn", "error"].includes(data.level) ? data.level : "log";
        append({ level: level as Line["level"], text: String(data.text).slice(0, 2000) });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [channel, client, append, runChecks]);

  useEffect(() => () => client.dispose(), [client]);

  async function runCode(source?: string) {
    const trimmed = (source ?? code).trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setTab("repl");
    const reply = await client.evalCode(trimmed);
    setAttempts((old) =>
      [...old, { code: trimmed, ok: reply.ok, text: reply.text }].slice(-MAX_ATTEMPTS),
    );
    if (!reply.ok) append({ level: "error", text: `REPL: ${reply.text}` });
    setBusy(false);
  }

  const summary = checks ? summarizeChecks(checks) : null;

  return (
    <div className="sandbox-panel">
      <div className="sandbox-stage">
        <div className="preview-toolbar">
          <button
            aria-label="โหลดแซนด์บ็อกซ์ใหม่"
            onClick={() => {
              setReloadKey((k) => k + 1);
              setReady(false);
              setChecks(null);
            }}
          >
            <RotateCcw size={15} />
          </button>
          <div className="preview-address">sandbox / index.html</div>
          <span className="sandbox-badge">
            <ShieldCheck size={13} /> ไม่มี allow-same-origin
          </span>
        </div>
        <div className="preview-stage">
          <iframe
            key={reloadKey}
            ref={frame}
            title="Sandbox"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={srcDoc}
          />
        </div>
      </div>

      <aside className="sandbox-side">
        <div className="sandbox-tabs" role="tablist" aria-label="Sandbox views">
          {(
            [
              { id: "console", icon: Terminal, label: "Console", count: lines.length },
              { id: "repl", icon: FlaskConical, label: "ทดลองโค้ด", count: attempts.length },
              {
                id: "checks",
                icon: ShieldCheck,
                label: "ตรวจสอบ",
                count: checks ? summary?.fail || summary?.warn || 0 : 0,
              },
            ] as const
          ).map(({ id, icon: Icon, label, count }) => (
            <button
              role="tab"
              aria-selected={tab === id}
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={14} />
              {label}
              {count ? <span className="count">{count}</span> : null}
            </button>
          ))}
        </div>

        {tab === "console" && (
          <div className="sandbox-body">
            <div className="sandbox-actions">
              <button className="subtle" onClick={() => setLines([])}>
                <Eraser size={13} /> ล้าง
              </button>
              <button className="subtle" disabled={busy} onClick={() => void runChecks()}>
                <ShieldCheck size={13} /> ตรวจ DOM
              </button>
            </div>
            <div className="console-lines" role="log">
              {!lines.length && <p>ยังไม่มี console output จากแอป</p>}
              {lines.map((line, i) => (
                <pre key={i} className={line.level}>
                  {line.level} › {line.text}
                </pre>
              ))}
            </div>
          </div>
        )}

        {tab === "repl" && (
          <div className="sandbox-body">
            <p className="sandbox-note">
              รัน JavaScript ในหน้าของแอป (เข้าถึง <code>document</code> ได้ แต่ไม่มี localStorage
              และออกเครือข่ายไม่ได้)
            </p>
            <form
              className="repl-form"
              onSubmit={(e) => {
                e.preventDefault();
                void runCode();
              }}
            >
              <textarea
                aria-label="โค้ดสำหรับทดลองในแซนด์บ็อกซ์"
                spellCheck={false}
                rows={2}
                value={code}
                disabled={busy}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void runCode();
                  }
                }}
              />
              <button className="primary" type="submit" disabled={busy || !ready}>
                {busy ? <Loader2 size={13} className="spin" /> : <Play size={13} />} รัน
              </button>
            </form>
            <div className="repl-quick">
              {QUICK_RUNS.map((item) => (
                <button
                  key={item.label}
                  className="subtle"
                  disabled={busy || !ready}
                  onClick={() => {
                    setCode(item.code);
                    void runCode(item.code);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="repl-results">
              {!attempts.length && <p>ผลลัพธ์จะแสดงที่นี่</p>}
              {[...attempts].reverse().map((attempt, i) => (
                <article key={i} className={attempt.ok ? "ok" : "bad"}>
                  <code>{attempt.code}</code>
                  <pre>
                    {attempt.ok ? "→ " : "✘ "}
                    {attempt.text || "(ไม่มีค่า)"}
                  </pre>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === "checks" && (
          <div className="sandbox-body">
            <div className="sandbox-actions">
              <button className="subtle" disabled={busy} onClick={() => void runChecks()}>
                {busy ? <Loader2 size={13} className="spin" /> : <RotateCcw size={13} />} ตรวจใหม่
              </button>
              {summary && (
                <span className="check-summary">
                  ผ่าน {summary.pass} · เตือน {summary.warn} · ไม่ผ่าน {summary.fail}
                </span>
              )}
            </div>
            {!checks && <p className="sandbox-note">กำลังตรวจ DOM ของแอป…</p>}
            {checks && (
              <>
                <p className="sandbox-note">{checksHeadline(checks)}</p>
                <ul className="check-list">
                  {checks.map((check) => (
                    <li key={check.id} className={check.status}>
                      {check.status === "pass" && <CheckCircle2 size={14} />}
                      {check.status === "warn" && <AlertTriangle size={14} />}
                      {check.status === "fail" && <CircleSlash size={14} />}
                      <div>
                        <strong>{check.label}</strong>
                        <span>{check.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="sandbox-footnote">
                  <Info size={12} /> ตัวตรวจนี้ทำงานในเครื่อง ตรวจเฉพาะโครงสร้างที่ตรวจได้จาก DOM
                  ไม่ใช่การรับรองว่าแอปปลอดภัยหรือผ่านมาตรฐาน WCAG ทั้งหมด
                </p>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
