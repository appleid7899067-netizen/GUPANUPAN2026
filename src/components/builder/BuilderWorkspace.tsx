"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Code2,
  Download,
  Eye,
  History,
  Loader2,
  MessageSquareText,
  Monitor,
  Play,
  RotateCcw,
  Save,
  Smartphone,
  Square,
  Terminal,
  Upload,
  Zap,
} from "lucide-react";
import { zipSync, strToU8 } from "fflate";
import {
  BUILD_SYSTEM_PROMPT,
  checkpoint,
  extractHtml,
  loadProject,
  MAX_HTML_SIZE,
  previewDocument,
  saveProject,
  type BuildProject,
} from "@/lib/builder";
import {
  aiErrorText,
  chunkText,
  getSavedModel,
  isSignedIn as puterIsSignedIn,
  PUTER_MODEL_PRESETS,
  refreshPuterSession,
  responseText,
  saveModel,
  type PuterAuthState,
} from "@/lib/puter";
import PuterAuthPanel from "./PuterAuthPanel";
import "./builder.css";

type LogLine = { level: string; text: string };
type WorkTab = "preview" | "code" | "history";
type MobileView = "chat" | "work";

const CUSTOM_MODEL = "__custom__";

export default function BuilderWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<BuildProject | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tab, setTab] = useState<WorkTab>("preview");
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [streamChars, setStreamChars] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState<PuterAuthState>({ status: "loading" });
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [channel, setChannel] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const run = useRef(0);
  const running = useRef(false);
  const cancelWait = useRef<(() => void) | null>(null);
  const dirty = !!project && draft !== project.html;
  const signedIn = auth.status === "signed-in";
  const puterReady = auth.status !== "loading" && auth.status !== "unavailable";

  const effectiveModel = useMemo(() => {
    if (model === CUSTOM_MODEL) return customModel.trim();
    return model.trim();
  }, [model, customModel]);

  useEffect(() => {
    setChannel(crypto.randomUUID());
    try {
      const stored = loadProject(projectId);
      setProject(stored);
      setDraft(stored?.html || "");
      setPrompt(sessionStorage.getItem(`gupan:prompt:${projectId}`) || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoaded(true);
    const saved = getSavedModel();
    if (saved && PUTER_MODEL_PRESETS.some((p) => p.id === saved)) {
      setModel(saved);
    } else if (saved) {
      setModel(CUSTOM_MODEL);
      setCustomModel(saved);
    }
    let alive = true;
    refreshPuterSession().then((s) => {
      if (alive) setAuth(s);
    });
    // Re-check quietly every 20s so a login in another tab is picked up.
    const id = setInterval(() => {
      refreshPuterSession().then((s) => {
        if (alive) setAuth(s);
      });
    }, 20000);
    return () => {
      alive = false;
      clearInterval(id);
      run.current++;
      cancelWait.current?.();
    };
  }, [projectId]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.channel !== channel ||
        !["log", "warn", "error"].includes(event.data.level) ||
        typeof event.data.text !== "string"
      )
        return;
      setLogs((old) => [
        ...old.slice(-99),
        { level: event.data.level, text: event.data.text.slice(0, 2000) },
      ]);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [channel]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [project?.messages.length, busy, streamChars]);

  // Elapsed-seconds ticker while streaming.
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      500,
    );
    return () => clearInterval(id);
  }, [busy]);

  const srcDoc = useMemo(
    () => (channel && project ? previewDocument(project.html, channel) : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project?.html, channel],
  );

  function apply(next: BuildProject) {
    saveProject(next); // Don't claim success or replace preview on quota failure.
    setProject(next);
    setDraft(next.html);
    setLogs([]);
    setPreviewKey((k) => k + 1);
  }

  function saveCode() {
    if (!project || busy) return;
    try {
      apply(checkpoint(project, draft, "ก่อนแก้โค้ดด้วยตัวเอง"));
      setError("");
      setStatus("บันทึกแล้วในเบราว์เซอร์นี้");
    } catch (e) {
      setError(aiErrorText(e));
    }
  }

  async function build() {
    if (!project || !prompt.trim() || running.current) return;
    if (dirty) {
      setError("บันทึกหรือยกเลิกการแก้โค้ดก่อนส่งคำสั่ง AI");
      setTab("code");
      setMobileView("work");
      return;
    }
    // Re-verify the live session (the cached chip may be stale).
    if (!puterIsSignedIn()) {
      setAuth({ status: "signed-out" });
      setError(
        "กดเข้าสู่ระบบ Puter ก่อนใช้ AI (แก้โค้ดเองได้โดยไม่ต้องเข้าสู่ระบบ)",
      );
      setMobileView("chat");
      return;
    }
    running.current = true;
    const ticket = ++run.current;
    const request = prompt.trim();
    const chosenModel = effectiveModel;
    setBusy(true);
    setStreamChars(0);
    setError("");
    setStatus("กำลังส่งคำสั่งให้ AI…");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const generate = async () => {
        const stream = await window.puter.ai.chat(
          [
            { role: "system", content: BUILD_SYSTEM_PROMPT },
            ...project.messages.slice(-6),
            {
              role: "user",
              content: `Current index.html:\n${project.html}\n\nRequested change:\n${request}`,
            },
          ],
          { stream: true, ...(chosenModel ? { model: chosenModel } : {}) },
        );
        // Streamed responses are async-iterable; tolerate a plain envelope too.
        if (stream && typeof stream[Symbol.asyncIterator] === "function") {
          let text = "";
          for await (const part of stream) {
            if (ticket !== run.current) return "";
            text += chunkText(part);
            if (text.length > MAX_HTML_SIZE + 1000)
              throw new Error("คำตอบ AI ใหญ่เกินขีดจำกัด");
            setStreamChars(text.length);
            setStatus(
              `AI กำลังเขียนโค้ด · ${text.length.toLocaleString()} ตัวอักษร`,
            );
          }
          return text;
        }
        return responseText(stream);
      };
      const raw = await Promise.race([
        generate(),
        new Promise<string>((_, reject) => {
          cancelWait.current = () => reject(new Error("ยกเลิกการรับผลแล้ว"));
          timer = setTimeout(
            () =>
              reject(
                new Error("AI ใช้เวลาเกิน 120 วินาที ลองใหม่หรือเปลี่ยนโมเดล"),
              ),
            120_000,
          );
        }),
      ]);
      if (ticket !== run.current) return;
      const html = extractHtml(raw);
      const next = checkpoint(project, html, `ก่อน: ${request}`);
      next.messages = [
        ...project.messages,
        { role: "user", content: request },
        {
          role: "assistant",
          content:
            "อัปเดต index.html แล้ว ตรวจผลใน Preview หรือแก้ไขต่อใน Code ได้เลย",
        },
      ].slice(-40) as BuildProject["messages"];
      apply(next);
      setPrompt("");
      try {
        sessionStorage.removeItem(`gupan:prompt:${projectId}`);
      } catch {
        /* Project is already saved. */
      }
      setStatus("สร้างเสร็จแล้ว · บันทึกในเบราว์เซอร์นี้");
      setTab("preview");
      setMobileView("work");
    } catch (e) {
      if (ticket === run.current) {
        // A stale login surfaces as an auth error from the provider.
        if (e && typeof e === "object") {
          try {
            if (!puterIsSignedIn()) setAuth({ status: "signed-out" });
          } catch {
            /* Keep the previous chip. */
          }
        }
        setError(aiErrorText(e));
        setStatus("สร้างไม่สำเร็จ · โค้ดเดิมยังอยู่");
      }
    } finally {
      if (timer) clearTimeout(timer);
      if (ticket === run.current) {
        cancelWait.current = null;
        run.current++;
        running.current = false;
        setBusy(false);
      }
    }
  }

  function stop() {
    run.current++;
    cancelWait.current?.();
    cancelWait.current = null;
    running.current = false;
    setBusy(false);
    setStatus("หยุดรับผลแล้ว · ผู้ให้บริการอาจยังประมวลผลและคิดโควตาอยู่");
  }

  function download() {
    if (!project) return;
    try {
      const zip = zipSync({
        "index.html": strToU8(draft),
        "README.txt": strToU8(
          "Open index.html in a browser. This is a static frontend, not a Node.js app. Review AI-generated code before publishing.\n",
        ),
        "project.json": strToU8(
          JSON.stringify({ ...project, html: draft }, null, 2),
        ),
      });
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(zip)], { type: "application/zip" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `gupan-${projectId}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(aiErrorText(e));
    }
  }

  async function importHtml(file?: File) {
    if (!file || !project) return;
    try {
      if (file.size > MAX_HTML_SIZE) throw new Error("นำเข้าได้สูงสุด 400 KB");
      const html = extractHtml(await file.text());
      if (
        !confirm(
          "นำเข้า HTML แทนโค้ดปัจจุบัน? โค้ดที่บันทึกล่าสุดจะอยู่ใน History",
        )
      )
        return;
      apply(checkpoint(project, html, "ก่อนนำเข้า HTML"));
      setError("");
      setTab("preview");
      setMobileView("work");
    } catch (e) {
      setError(aiErrorText(e));
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (!loaded)
    return (
      <div className="builder workspace-loading">
        <Loader2 className="spin" size={22} /> กำลังเปิดโปรเจกต์…
      </div>
    );

  if (!project)
    return (
      <div className="builder workspace-loading">
        <h1>ไม่พบโปรเจกต์ในเบราว์เซอร์นี้</h1>
        <p>
          {error || "โปรเจกต์ยังไม่ซิงก์ข้ามเครื่อง ลองกลับไปสร้างโปรเจกต์ใหม่"}
        </p>
        <Link href="/">← กลับหน้าหลัก</Link>
      </div>
    );

  return (
    <div className="builder workspace" data-mobile-view={mobileView}>
      <header className="builder-header work-header">
        <Link
          href="/"
          className="back-btn"
          aria-label="กลับหน้าหลัก"
          onClick={(e) => {
            if (
              (dirty || busy) &&
              !confirm("ออกจากหน้านี้? งานที่ยังไม่บันทึกหรือผล AI อาจสูญหาย")
            )
              e.preventDefault();
          }}
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="brand work-brand">
          <span className="brand-mark">
            <Zap size={13} fill="currentColor" />
          </span>
          GUPAN
        </span>
        <span className="project-title" title={project.name}>
          {project.name}
        </span>
        <span className={`saved-status ${dirty ? "dirty" : ""}`}>
          {dirty ? (
            "ยังไม่บันทึก"
          ) : (
            <>
              <Check size={12} /> Local save
            </>
          )}
        </span>
        <button
          className="subtle import-btn"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          aria-label="นำเข้า HTML"
        >
          <Upload size={14} />
          <span>นำเข้า</span>
        </button>
        <button className="primary export-btn" onClick={download}>
          <Download size={14} /> <span>Export</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".html,.htm"
          hidden
          onChange={(e) => void importHtml(e.target.files?.[0])}
        />
      </header>

      <div className="workspace-body">
        <aside className="chat-panel" aria-label="แชทสร้างเว็บ">
          <div className="chat-heading">
            <span>
              <MessageSquareText size={15} /> Build assistant
            </span>
            <span className={`mode-pill ${signedIn ? "on" : ""}`}>
              <i /> {signedIn ? `Puter · ${auth.status === "signed-in" ? auth.username || "ready" : "ready"}` : "Puter AI"}
            </span>
          </div>

          <div className="chat-messages">
            <div className="assistant-intro">
              <div className="assistant-symbol">✦</div>
              <h2>จากไอเดีย สู่เว็บของคุณ</h2>
              <p>
                สั่งสร้างเว็บ แล้วแก้ต่อได้เรื่อย ๆ AI จะเห็นโค้ดล่าสุดของคุณทุกครั้ง
              </p>
              <div className="scope-note">
                โหมดนี้สร้าง HTML/CSS/JS แบบไฟล์เดียว
                <br />
                ไม่มี npm, terminal server หรือฐานข้อมูลจริง
              </div>
            </div>
            {project.messages.map((message, i) => (
              <div key={i} className={`chat-message ${message.role}`}>
                <small>{message.role === "user" ? "คุณ" : "GUPAN"}</small>
                <p>{message.content}</p>
              </div>
            ))}
            {busy && (
              <div className="build-progress" role="status">
                <Loader2 size={16} className="spin" />
                <div>
                  <b>AI กำลังเขียนโค้ด… {elapsed}s</b>
                  <small>
                    {streamChars > 0
                      ? `รับมาแล้ว ${streamChars.toLocaleString()} ตัวอักษร`
                      : "กำลังรอผลชิ้นแรก"}
                  </small>
                  <span className="progress-bar" aria-hidden>
                    <i />
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          <div className="composer-area">
            {error && (
              <div className="builder-error" role="alert">
                {error}
                <button
                  aria-label="ปิดข้อความผิดพลาด"
                  onClick={() => setError("")}
                >
                  ×
                </button>
              </div>
            )}
            <PuterAuthPanel auth={auth} onChange={setAuth} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void build();
              }}
            >
              <textarea
                aria-label="คำสั่ง AI"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="อยากสร้างหรือแก้ไขอะไร?"
                maxLength={6000}
                disabled={busy}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void build();
                  }
                }}
              />
              <div className="composer-bottom">
                <span className="composer-hint">Ctrl/⌘ + Enter</span>
                {busy ? (
                  <button
                    type="button"
                    className="stop-button"
                    onClick={(e) => {
                      e.preventDefault();
                      stop();
                    }}
                  >
                    <Square size={12} /> หยุดรับผล
                  </button>
                ) : (
                  <button
                    className="primary"
                    type="submit"
                    disabled={!prompt.trim() || !puterReady}
                    title={
                      !puterReady
                        ? "กำลังเชื่อมต่อ Puter…"
                        : !signedIn
                          ? "ต้องเข้าสู่ระบบ Puter ก่อน"
                          : "ส่งคำสั่งให้ AI"
                    }
                  >
                    <ArrowUp size={16} /> ส่งคำสั่ง
                  </button>
                )}
              </div>
            </form>
            <div className="model-row">
              <label className="model-field">
                <span>Model</span>
                <span className="model-select-wrap">
                  <select
                    aria-label="เลือกโมเดล Puter"
                    value={model}
                    disabled={busy}
                    onChange={(e) => {
                      setModel(e.target.value);
                      saveModel(
                        e.target.value === CUSTOM_MODEL
                          ? customModel.trim()
                          : e.target.value,
                      );
                    }}
                  >
                    {PUTER_MODEL_PRESETS.map((p) => (
                      <option key={p.id || "auto"} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                    <option value={CUSTOM_MODEL}>ระบุเอง…</option>
                  </select>
                  <ChevronDown size={13} />
                </span>
              </label>
              {model === CUSTOM_MODEL && (
                <input
                  aria-label="Puter model ID"
                  placeholder="เช่น gpt-5-mini"
                  value={customModel}
                  disabled={busy}
                  onChange={(e) => {
                    setCustomModel(e.target.value);
                    saveModel(e.target.value.trim());
                  }}
                />
              )}
            </div>
            <small className="billing-note">
              ใช้โควตา/ค่าบริการบัญชี Puter ของคุณ · ไม่ส่งคำสั่งอัตโนมัติ
            </small>
          </div>
        </aside>

        <section className="work-panel" aria-label="พื้นที่ทำงาน">
          <div className="work-tabs">
            <div role="tablist" aria-label="Workspace views">
              {(
                [
                  { id: "preview", icon: Eye, label: "Preview" },
                  { id: "code", icon: Code2, label: "Code" },
                  { id: "history", icon: History, label: "History" },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  role="tab"
                  aria-selected={tab === id}
                  key={id}
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
            <span className="sandbox-label">
              <i /> Isolated preview
            </span>
          </div>

          {tab === "preview" && (
            <div className="preview-panel">
              <div className="preview-toolbar">
                <button
                  aria-label="โหลดพรีวิวใหม่"
                  onClick={() => {
                    setPreviewKey((k) => k + 1);
                    setLogs([]);
                  }}
                >
                  <RotateCcw size={15} />
                </button>
                <div className="preview-address">preview / index.html</div>
                <button
                  aria-label="Desktop preview"
                  aria-pressed={!mobilePreview}
                  className={!mobilePreview ? "selected" : ""}
                  onClick={() => setMobilePreview(false)}
                >
                  <Monitor size={16} />
                </button>
                <button
                  aria-label="Mobile preview"
                  aria-pressed={mobilePreview}
                  className={mobilePreview ? "selected" : ""}
                  onClick={() => setMobilePreview(true)}
                >
                  <Smartphone size={16} />
                </button>
              </div>
              <div
                className={`preview-stage ${mobilePreview ? "mobile-preview" : ""}`}
              >
                <iframe
                  key={previewKey}
                  ref={frame}
                  title="App preview"
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                  srcDoc={srcDoc}
                />
              </div>
            </div>
          )}

          {tab === "code" && (
            <div className="code-panel">
              <div className="code-toolbar">
                <span>
                  <Code2 size={14} /> index.html
                  {dirty && <em className="dirty-dot">• แก้ไขแล้ว</em>}
                </span>
                <div>
                  <button
                    className="subtle"
                    disabled={!dirty || busy}
                    onClick={() => {
                      if (confirm("ยกเลิกการแก้ไขที่ยังไม่บันทึก?"))
                        setDraft(project.html);
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className="primary"
                    disabled={!dirty || busy}
                    onClick={saveCode}
                  >
                    <Save size={13} /> บันทึกและรัน
                  </button>
                </div>
              </div>
              <textarea
                className="code-editor"
                aria-label="index.html source code"
                spellCheck={false}
                value={draft}
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                    e.preventDefault();
                    saveCode();
                  }
                }}
              />
              <div className="code-footnote">
                {draft.split("\n").length} lines · {(draft.length / 1000).toFixed(1)} KB ·
                Ctrl/⌘ + S เพื่อบันทึกและอัปเดตพรีวิว
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="history-panel">
              <h2>ประวัติโค้ด</h2>
              <p>เก็บโค้ดก่อนแก้ไข 8 ครั้งล่าสุดในเบราว์เซอร์นี้</p>
              {!project.versions.length && (
                <div className="empty-projects">
                  <History size={26} />
                  <p>เมื่อบันทึกหรือให้ AI แก้โค้ด ประวัติจะปรากฏที่นี่</p>
                </div>
              )}
              {project.versions.map((version) => (
                <article key={version.id}>
                  <div>
                    <h3>{version.label}</h3>
                    <small>
                      {new Date(version.createdAt).toLocaleString("th-TH")}
                    </small>
                  </div>
                  <button
                    className="subtle"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !confirm(
                          "กู้คืนเวอร์ชันนี้? การแก้ไขที่ยังไม่บันทึกจะหายไป",
                        )
                      )
                        return;
                      try {
                        apply(
                          checkpoint(
                            project,
                            version.html,
                            "ก่อนกู้คืนเวอร์ชัน",
                          ),
                        );
                        setTab("preview");
                        setError("");
                      } catch (e) {
                        setError(aiErrorText(e));
                      }
                    }}
                  >
                    <RotateCcw size={13} /> กู้คืน
                  </button>
                </article>
              ))}
            </div>
          )}

          <div className="console-section">
            <button
              className="console-toggle"
              onClick={() => setShowLogs(!showLogs)}
              aria-expanded={showLogs}
            >
              <Terminal size={13} /> Console <span>{logs.length}</span>
              <span className="console-status">
                {busy ? `Building… ${elapsed}s` : status || "พร้อมใช้งาน"}
              </span>
            </button>
            {showLogs && (
              <div className="console-lines" role="log">
                <button className="subtle" onClick={() => setLogs([])}>
                  ล้าง log
                </button>
                {!logs.length && (
                  <p>
                    ยังไม่มี console output · ข้อผิดพลาด JavaScript จะแสดงที่นี่
                  </p>
                )}
                {logs.map((line, i) => (
                  <pre key={i} className={line.level}>
                    {line.level} › {line.text}
                  </pre>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <nav className="mobile-nav" aria-label="สลับมุมมอง">
        <button
          className={mobileView === "chat" ? "active" : ""}
          onClick={() => setMobileView("chat")}
          aria-label="มุมมองแชท"
          aria-pressed={mobileView === "chat"}
        >
          <MessageSquareText size={18} />
          <small>แชท</small>
        </button>
        <button
          className={mobileView === "work" && tab === "preview" ? "active" : ""}
          onClick={() => {
            setTab("preview");
            setMobileView("work");
          }}
          aria-label="มุมมองพรีวิว"
          aria-pressed={mobileView === "work" && tab === "preview"}
        >
          <Eye size={18} />
          <small>พรีวิว</small>
        </button>
        <button
          className={mobileView === "work" && tab === "code" ? "active" : ""}
          onClick={() => {
            setTab("code");
            setMobileView("work");
          }}
          aria-label="มุมมองโค้ด"
          aria-pressed={mobileView === "work" && tab === "code"}
        >
          <Code2 size={18} />
          <small>โค้ด</small>
        </button>
        <button
          className={mobileView === "work" && tab === "history" ? "active" : ""}
          onClick={() => {
            setTab("history");
            setMobileView("work");
          }}
          aria-label="มุมมองประวัติ"
          aria-pressed={mobileView === "work" && tab === "history"}
        >
          <History size={18} />
          <small>ประวัติ</small>
        </button>
      </nav>

      <footer className="workspace-footer">
        <span>
          <Play size={10} /> Browser sandbox · ไม่มีสิทธิ์เข้าถึงบัญชี Puter
        </span>
        <span>Local storage · Export เพื่อสำรองงาน</span>
      </footer>
    </div>
  );
}
