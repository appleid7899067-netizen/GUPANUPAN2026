"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  ChevronsUpDown,
  ListChecks,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  Code2,
  Download,
  Eye,
  History,
  Loader2,
  LogIn,
  Mic,
  Monitor,
  MoreHorizontal,
  Package,
  Play,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Smartphone,
  Square,
  Tablet,
  Terminal,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { zipSync, strToU8 } from "fflate";
import {
  changedPaths,
  checkpoint,
  defaultPage,
  extractFiles,
  extractHtml,
  extractSummary,
  inlineAssets,
  loadProject,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
  previewDocument,
  sameFiles,
  saveProject,
  type BuildProject,
} from "@/lib/builder";
import { BUILD_MODES, DEFAULT_MODE_ID, getBuildMode, systemPromptFor } from "@/lib/build-modes";
import {
  AGENT_KIT_DIR,
  AGENT_KIT_FILES,
  buildAgentYaml,
  buildHandoffReadme,
  DEFAULT_AGENT_MODEL,
} from "@/lib/agent-export";
import { ensurePuterAuth, ensurePuterLoaded } from "@/lib/puter";
import PuterAccountButton from "./PuterAccountButton";
import SandboxPanel from "./SandboxPanel";
import { useSpeechInput } from "./use-speech-input";
import MarkdownLite from "./MarkdownLite";
import "./builder.css";

/**
 * ═══ หน้า 2 จาก 2 หน้าของบิลเดอร์ (รูปแบบเดียวกับ bolt.new) ═══════════════
 *
 * bolt.new มี 2 หน้า: หน้าแรกใส่พรอมป์ (`BuilderHome.tsx`) และหน้านี้ —
 * แชตอยู่ซ้าย มุมมองงานอยู่ขวา ด้านขวาจึงเหลือแท็บหลัก 2 แท็บเหมือน Bolt คือ
 * Preview กับ Code ส่วน Sandbox (REPL/ตัวตรวจ DOM) และ History ไม่หายไปไหน
 * แต่เปิดเป็น "แผงลอย" ทับพื้นที่ขวา จากปุ่มย่อยในแถบแท็บหรือเมนู ⋯ บนหัวเพจ
 */
type LogLine = { level: string; text: string };
type WorkTab = "preview" | "code";
type Plan = {
  step: number;
  live: boolean;
  chars: number;
  error?: string;
  writes?: string[];
};

/**
 * ส่งไฟล์ปัจจุบันของโปรเจกต์ให้ AI เห็นทุกครั้งที่จะแก้
 * ถ้ารวมกันใหญ่เกิน 60 KB ส่งเฉพาะ index.html + รายชื่อไฟล์ที่เหลือ
 */
function filesContext(files: Record<string, string>): string {
  const entries = Object.entries(files);
  const total = entries.reduce((sum, [, content]) => sum + content.length, 0);
  if (total <= 60_000) {
    return `Current files:
${entries
      .map(([path, content]) => "```file:" + path + "\n" + content + "\n```")
      .join("\n")}`;
  }
  return `Current index.html:
${files["index.html"] ?? ""}
Other files in the project: ${Object.keys(files).join(", ")}`;
}
type WorkOverlay = "sandbox" | "history";
/** ขนาดพรีวิว — Bolt ให้เลือก desktop / tablet / mobile */
type Device = "desktop" | "tablet" | "mobile";

export default function BuilderWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<BuildProject | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftPath, setDraftPath] = useState("index.html");
  const [page, setPage] = useState("index.html");
  const [streamSummary, setStreamSummary] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tab, setTab] = useState<WorkTab>("preview");
  const [overlay, setOverlay] = useState<WorkOverlay | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [mode, setMode] = useState<string>(DEFAULT_MODE_ID);
  const [device, setDevice] = useState<Device>("desktop");
  /** จอแคบแบบ Bolt: เห็นทีละ pane — แชตเต็มจอ หรือ pane งาน (พรีวิว/โค้ด) */
  const [mobileView, setMobileView] = useState<"chat" | "work">("chat");
  /** การ์ดแผนงาน: step = จำนวนขั้นที่เสร็จแล้ว (แต่ละขั้น = เหตุการณ์จริงใน pipeline) */
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planOpen, setPlanOpen] = useState(true);
  const [lastBuild, setLastBuild] = useState<{
    label: string;
    at: string;
    version: number;
  } | null>(null);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [model, setModel] = useState("");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [channel, setChannel] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const projectRef = useRef<BuildProject | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const menuBox = useRef<HTMLDivElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const run = useRef(0);
  const running = useRef(false);
  const cancelWait = useRef<(() => void) | null>(null);
  const dirty = !!project && !sameFiles(drafts, project.files);
  const lastUserIndex =
    project?.messages.reduce(
      (acc, message, i) => (message.role === "user" ? i : acc),
      -1,
    ) ?? -1;
  const speech = useSpeechInput((text) =>
    setPrompt((current) => (current.trim() ? `${current} ${text}` : text)),
  );

  useEffect(() => {
    setChannel(crypto.randomUUID());
    try {
      const stored = loadProject(projectId);
      setProject(stored);
      const files = stored?.files ?? {};
      setDrafts(files);
      setDraftPath(defaultPage(files));
      setPage(defaultPage(files));
      setPrompt(sessionStorage.getItem(`gupan:prompt:${projectId}`) || "");
      const savedMode = localStorage.getItem(`gupan:mode:${projectId}`);
      if (savedMode && BUILD_MODES.some((item) => item.id === savedMode)) setMode(savedMode);
    } catch (e) {
      setError(String(e));
    }
    setLoaded(true);
    let alive = true;
    ensurePuterLoaded()
      .then((ok) => {
        if (alive) {
          setReady(ok);
          setSignedIn(!!window.puter?.auth?.isSignedIn?.());
        }
      })
      .catch(() => {
        if (alive) setStatus("โหลด Puter ไม่สำเร็จ ยังแก้โค้ดและพรีวิวได้");
      });
    return () => {
      alive = false;
      run.current++;
      cancelWait.current?.();
    };
  }, [projectId]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.channel !== channel
      )
        return;
      // link ภายในแอปที่สร้าง: ข้ามหน้าโดยไม่ออกจาก sandbox
      if (typeof event.data.navigate === "string") {
        const target = event.data.navigate.split("#")[0];
        if (projectRef.current?.files[target] !== undefined) setPage(target);
        return;
      }
      if (
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
  }, [project?.messages.length, busy]);
  // เมนูย่อย/แผงลอยปิดได้ด้วย Escape และคลิกนอกกรอบ — พฤติกรรมเดียวกับ popover ของ Bolt
  useEffect(() => {
    if (!overlay && !menuOpen) return;
    const away = (event: MouseEvent) => {
      if (menuOpen && !menuBox.current?.contains(event.target as Node))
        setMenuOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuOpen) setMenuOpen(false);
      else setOverlay(null);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [overlay, menuOpen]);
  const srcDoc = useMemo(
    () =>
      channel && project ? previewDocument(project.files, page, channel) : "",
    [project?.files, page, channel],
  );

  /** สลับมุมมองหลัก Preview/Code และปิดแผงลอยที่ทับอยู่ */
  function showTab(next: WorkTab) {
    setOverlay(null);
    setTab(next);
  }
  useEffect(() => {
    projectRef.current = project;
  }, [project]);
  function apply(next: BuildProject) {
    saveProject(next); // Don't claim a successful save or replace the preview on quota failure.
    setProject(next);
    setDrafts(next.files);
    setDraftPath((current) =>
      next.files[current] !== undefined ? current : defaultPage(next.files),
    );
    setPage((current) =>
      next.files[current] !== undefined ? current : defaultPage(next.files),
    );
    setLogs([]);
    setPreviewKey((k) => k + 1);
  }
  function saveCode() {
    if (!project || busy) return;
    try {
      apply(checkpoint(project, drafts, "ก่อนแก้โค้ดด้วยตัวเอง"));
      setError("");
      setStatus("บันทึกแล้วในเบราว์เซอร์นี้");
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function signIn() {
    try {
      if (!ready) {
        setReady(await ensurePuterLoaded());
        setStatus("กดเข้าสู่ระบบอีกครั้งเพื่อเปิดหน้าต่าง Puter");
        return;
      }
      const ok = await ensurePuterAuth();
      setSignedIn(ok);
      if (!ok)
        setError(
          "ยังไม่ได้เข้าสู่ระบบ Puter กรุณาอนุญาต popup แล้วลองอีกครั้ง",
        );
      else {
        setError("");
        setStatus("เชื่อมต่อ Puter แล้ว พร้อมสร้าง");
      }
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function build() {
    if (!project || !prompt.trim() || running.current) return;
    if (dirty) {
      setError("บันทึกหรือยกเลิกการแก้โค้ดก่อนส่งคำสั่ง AI");
      showTab("code");
      return;
    }
    if (!window.puter?.auth?.isSignedIn?.()) {
      setSignedIn(false);
      setError(
        "กดเข้าสู่ระบบ Puter ก่อนใช้ AI (แก้โค้ดเองได้โดยไม่ต้องเข้าสู่ระบบ)",
      );
      return;
    }
    running.current = true;
    const ticket = ++run.current;
    const request = prompt.trim();
    setBusy(true);
    setError("");
    setPlan({ step: 1, live: true, chars: 0 });
    setStreamSummary("");
    setPlanOpen(true);
    setLastBuild(null);
    setFeedback(null);
    setStatus("กำลังส่งคำสั่งให้ AI…");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const generate = async () => {
        let gotStream = false;
        const stream = await window.puter.ai.chat(
          [
            { role: "system", content: systemPromptFor(mode) },
            ...project.messages.slice(-6),
            {
              role: "user",
              content: `${filesContext(project.files)}\n\nRequested change:\n${request}`,
            },
          ],
          { stream: true, ...(model.trim() ? { model: model.trim() } : {}) },
        );
        let text = "";
        for await (const chunk of stream) {
          if (ticket !== run.current) return "";
          if (!gotStream) {
            gotStream = true;
            setPlan((p) => (p ? { ...p, step: 2 } : p)); // เชื่อมต่อ AI สำเร็จ
          }
          if (typeof chunk?.text === "string") text += chunk.text;
          if (text.length > MAX_TOTAL_SIZE + 1000)
            throw new Error("คำตอบ AI ใหญ่เกินขีดจำกัด");
          setPlan((p) => (p ? { ...p, chars: text.length } : p));
          // สตรีมส่วนสรุปคำต่อคำลงแชทแบบ Bolt (หยุดที่ fence ไฟล์แรก)
          const fenceAt = text.indexOf("```");
          const head = fenceAt === -1 ? text : text.slice(0, fenceAt);
          if (!/^\s*<!doctype|^\s*<html/i.test(head))
            setStreamSummary(head.slice(0, 700));
          setStatus(
            `AI กำลังเขียนโค้ด · ${text.length.toLocaleString()} ตัวอักษร`,
          );
        }
        return text;
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
      setPlan((p) => (p ? { ...p, step: 3 } : p)); // รับคำตอบครบแล้ว
      const files = extractFiles(raw);
      setPlan((p) => (p ? { ...p, step: 4 } : p)); // ชุดไฟล์สมบูรณ์
      const writes = changedPaths(project.files, files);
      const next = checkpoint(project, files, `ก่อน: ${request}`);
      next.messages = [
        ...project.messages,
        { role: "user", content: request },
        {
          role: "assistant",
          content:
            extractSummary(raw) ||
            "อัปเดต index.html แล้ว ตรวจผลในพรีวิว หรือแก้ไขต่อในแท็บโค้ดได้เลย",
        },
      ].slice(-40) as BuildProject["messages"];
      apply(next);
      setLastBuild({
        label: request.slice(0, 80),
        at: new Date().toISOString(),
        version: next.versions.length,
      });
      setPlan({ step: 5, live: false, chars: raw.length, writes });
      setStreamSummary("");
      setPrompt("");
      try {
        sessionStorage.removeItem(`gupan:prompt:${projectId}`);
      } catch {
        /* Project is already saved. */
      }
      setStatus("สร้างเสร็จแล้ว · บันทึกในเบราว์เซอร์นี้");
      showTab("preview");
    } catch (e) {
      if (ticket === run.current) {
        setError(errorText(e));
        setStatus("สร้างไม่สำเร็จ · โค้ดเดิมยังอยู่");
        setPlan((p) => ({
          step: p?.step ?? 0,
          chars: p?.chars ?? 0,
          live: false,
          error: errorText(e),
        }));
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
  async function copyAnswer() {
    const last = [...project.messages]
      .reverse()
      .find((message) => message.role === "assistant");
    if (!last) return;
    try {
      await navigator.clipboard.writeText(last.content);
      setError("");
      setStatus("คัดลอกคำตอบล่าสุดแล้ว");
    } catch {
      setError("คัดลอกอัตโนมัติไม่ได้ — กรุณาเลือกข้อความแล้วคัดลอกเอง");
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
        ...Object.fromEntries(
          Object.entries(drafts).map(([path, content]) => [
            path,
            strToU8(content),
          ]),
        ),
        "README.txt": strToU8(
          "Open index.html in a browser. This is a static frontend, not a Node.js app. Review AI-generated code before publishing.\n",
        ),
        "project.json": strToU8(
          JSON.stringify({ ...project, files: drafts }, null, 2),
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
      setError(errorText(e));
    }
  }
  function saveZip(files: Record<string, Uint8Array>, name: string) {
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(zipSync(files, { level: 6 }))], { type: "application/zip" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * ส่งออก "ชุดทำงานต่อ" สำหรับ docker-agent + บัญชี Puter
   * แนบสคริปต์ล็อกอินจริงจาก /agent-kit เพื่อให้รันต่อได้ทันทีโดยไม่ต้องตั้งค่าเอง
   */
  async function downloadAgentKit() {
    if (!project || busy) return;
    try {
      setStatus("กำลังเตรียมชุด agent…");
      const options = { mode, model: model.trim() || DEFAULT_AGENT_MODEL };
      const files: Record<string, Uint8Array> = {
        [`${AGENT_KIT_DIR}/agent.yaml`]: strToU8(buildAgentYaml(project, options)),
        [`${AGENT_KIT_DIR}/README.md`]: strToU8(buildHandoffReadme(project, options)),
        ...Object.fromEntries(
          Object.entries(drafts).map(([path, content]) => [
            `${AGENT_KIT_DIR}/${path}`,
            strToU8(content),
          ]),
        ),
      };
      let attached = 0;
      for (const path of AGENT_KIT_FILES) {
        try {
          const response = await fetch(`/agent-kit/${path}`);
          if (response.ok) {
            files[`${AGENT_KIT_DIR}/${path}`] = new Uint8Array(await response.arrayBuffer());
            attached += 1;
          }
        } catch {
          /* ไม่มีสคริปต์ก็ยังใช้ agent.yaml ที่เหลือได้ */
        }
      }
      saveZip(files, `gupan-agent-kit-${projectId}.zip`);
      setError("");
      setStatus(
        attached === AGENT_KIT_FILES.length
          ? "ดาวน์โหลดชุด agent แล้ว · ปลด ZIP แล้วทำตาม README.md"
          : "ดาวน์โหลดชุด agent แล้ว (ไม่พบสคริปต์ล็อกอิน ให้สร้าง token จาก puter.com/dashboard)",
      );
    } catch (e) {
      setError(errorText(e));
      setStatus("");
    }
  }
  async function importHtml(file?: File) {
    if (!file || !project) return;
    try {
      if (file.size > MAX_FILE_SIZE) throw new Error("นำเข้าได้สูงสุด 400 KB");
      const html = extractHtml(await file.text());
      if (
        !confirm(
          "นำเข้า HTML แทนโค้ดปัจจุบัน? โค้ดที่บันทึกล่าสุดจะอยู่ใน History",
        )
      )
        return;
      apply(
        checkpoint(
          project,
          { ...project.files, "index.html": html },
          "ก่อนนำเข้า HTML",
        ),
      );
      setError("");
      showTab("preview");
    } catch (e) {
      setError(errorText(e));
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  if (!loaded)
    return (
      <div className="builder workspace-loading">
        <Loader2 className="spin" /> กำลังเปิดโปรเจกต์…
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
    <div className="builder workspace">
      {/* ── แถบบนแบบ Bolt: กลับ · โลโก้ · ชื่อโปรเจกต์ ‖ บัญชี · Export · เมนู ⋯ ── */}
      <header className="builder-header">
        <Link
          href="/"
          className="icon-button"
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
        <span className="brand">
          <Zap size={18} fill="currentColor" /> GUPAN<span>studio</span>
        </span>
        <span className="project-title">{project.name}</span>
        <span className="saved-status">
          {dirty ? (
            "ยังไม่บันทึก"
          ) : (
            <>
              <Check size={13} /> Local save
            </>
          )}
        </span>
        <div className="header-actions">
          <PuterAccountButton
            onStatus={(message) => {
              setError("");
              setStatus(message);
            }}
            onError={(message) => setError(message)}
          />
          <button className="primary" onClick={download}>
            <Download size={15} /> Export ZIP
          </button>
          {/* เมนู ⋯ : เครื่องมือรองที่ไม่ใช่แท็บหลัก (นำเข้า · ส่งออก · แซนด์บ็อกซ์ · ประวัติ) */}
          <div className="menu-anchor" ref={menuBox}>
            <button
              className="icon-button"
              aria-label="เครื่องมือเพิ่มเติม"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="menu-pop" role="menu" aria-label="เครื่องมือเพิ่มเติม">
                <button
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setMenuOpen(false);
                    fileInput.current?.click();
                  }}
                >
                  <Upload size={15} /> นำเข้า HTML
                </button>
                <button
                  role="menuitem"
                  disabled={busy}
                  title="ชุดไฟล์สำหรับทำงานต่อด้วย docker-agent โดยใช้บัญชี Puter"
                  onClick={() => {
                    setMenuOpen(false);
                    void downloadAgentKit();
                  }}
                >
                  <Package size={15} /> ส่งออก Agent kit
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setOverlay("sandbox");
                  }}
                >
                  <Terminal size={15} /> Sandbox · REPL
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setOverlay("history");
                  }}
                >
                  <History size={15} /> ประวัติโค้ด
                  {!!project.versions.length && (
                    <span className="menu-count">{project.versions.length}</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".html,.htm"
          hidden
          onChange={(e) => void importHtml(e.target.files?.[0])}
        />
      </header>
      {/* จอแคบแบบ Bolt: immersive ทีละ pane — แชตมี pill เปิดงาน, pane งานมีปุ่มกลับ */}
      <div
        className={`mobile-switch ${
          mobileView === "chat" ? "is-chat" : "is-work"
        }`}
      >
        {mobileView === "chat" ? (
          <button
            className="switch-pill"
            onClick={() => setMobileView("work")}
          >
            <Eye size={14} /> พรีวิวและโค้ด
          </button>
        ) : (
          <>
            <button
              className="switch-back"
              onClick={() => setMobileView("chat")}
            >
              <ArrowLeft size={14} /> กลับสู่การสนทนา
            </button>
            <span className="switch-seg">
              {(
                [
                  { id: "preview", label: "พรีวิว" },
                  { id: "code", label: "โค้ด" },
                ] as const
              ).map(({ id, label }) => (
                <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </span>
          </>
        )}
      </div>
      <div
        className={`workspace-body ${
          mobileView === "chat" ? "show-chat" : "show-work"
        }`}
      >
        <aside className="chat-panel">
          <div className="chat-heading">
            <span>
              <Zap size={16} /> Build assistant
            </span>
            <span className="mode-pill">Puter AI</span>
          </div>
          <div className="chat-scroll-wrap">
            <div
              className="chat-messages"
              onScroll={(e) => {
                const el = e.currentTarget;
                setAtBottom(
                  el.scrollTop + el.clientHeight >= el.scrollHeight - 60,
                );
              }}
            >
              <div className="assistant-intro">
                <div className="assistant-wordmark" aria-hidden="true">
                  gupan
                </div>
                <h2>จากไอเดีย สู่เว็บของคุณ</h2>
                <p>
                  สั่งสร้างเว็บ แล้วแก้ต่อได้เรื่อย ๆ AI
                  จะเห็นโค้ดล่าสุดของคุณทุกครั้ง
                </p>
                <div className="scope-note">
                  โหมดนี้สร้าง HTML/CSS/JS แบบไฟล์เดียว
                  <br />
                  ไม่มี npm, terminal server หรือฐานข้อมูลจริง
                </div>
              </div>
              {project.messages.map((message, i) => (
                <Fragment key={i}>
                  <div className={`chat-message ${message.role}`}>
                    <small>{message.role === "user" ? "คุณ" : "GUPAN"}</small>
                    <MarkdownLite text={message.content} />
                  </div>
                  {i === lastUserIndex && plan && (
                    <BuildActivity
                      plan={plan}
                      reads={Object.keys(project.files)}
                      open={planOpen}
                      onToggle={() => setPlanOpen((value) => !value)}
                    />
                  )}
                </Fragment>
              ))}
              {busy && streamSummary && (
                <div className="chat-message assistant streaming">
                  <small>GUPAN</small>
                  <MarkdownLite text={streamSummary} />
                </div>
              )}
              {busy && (
                <div className="build-progress" role="status">
                  <Brain size={16} /> {status}
                </div>
              )}
              {!busy && lastBuild && (
                <>
                  <div className="feedback-row">
                    <button
                      className="ghost-btn"
                      aria-label="คัดลอกคำตอบ"
                      title="คัดลอกคำตอบ"
                      onClick={() => void copyAnswer()}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="ghost-btn"
                      aria-label="ถูกใจคำตอบ"
                      title="ถูกใจคำตอบ"
                      aria-pressed={feedback === "up"}
                      onClick={() =>
                        setFeedback((value) => (value === "up" ? null : "up"))
                      }
                    >
                      <ThumbsUp size={15} />
                    </button>
                    <button
                      className="ghost-btn"
                      aria-label="ไม่ถูกใจคำตอบ"
                      title="ไม่ถูกใจคำตอบ"
                      aria-pressed={feedback === "down"}
                      onClick={() =>
                        setFeedback((value) => (value === "down" ? null : "down"))
                      }
                    >
                      <ThumbsDown size={15} />
                    </button>
                  </div>
                  <button
                    className="version-card"
                    onClick={() => setOverlay("history")}
                  >
                    <span>
                      <strong>สร้าง: {lastBuild.label}</strong>
                      <small>
                        เวอร์ชัน {lastBuild.version} ณ{" "}
                        {new Date(lastBuild.at).toLocaleString("th-TH", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </span>
                    <Bookmark size={16} />
                  </button>
                </>
              )}
              <div ref={chatEnd} />
            </div>
            {!atBottom && (
              <button
                className="scroll-fab"
                aria-label="เลื่อนลงล่างสุด"
                title="เลื่อนลงล่างสุด"
                onClick={() =>
                  chatEnd.current?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <ArrowDown size={16} />
              </button>
            )}
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
            {!signedIn && (
              <button className="sign-in" onClick={() => void signIn()}>
                <LogIn size={15} /> เข้าสู่ระบบ Puter เพื่อใช้ AI
              </button>
            )}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void build();
                  }
                }}
              />
              <div className="composer-row">
                <button
                  type="button"
                  className="round-btn"
                  aria-label="นำเข้า HTML"
                  title="นำเข้า HTML"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                >
                  <Plus size={16} />
                </button>
                <label className="mode-select">
                  <select
                    aria-label="โหมดการสร้าง"
                    value={mode}
                    disabled={busy}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMode(next);
                      try {
                        localStorage.setItem(`gupan:mode:${projectId}`, next);
                      } catch {
                        /* โหมดเป็นเพียงตัวช่วย ไม่กระทบการบันทึกโปรเจกต์ */
                      }
                      setStatus(
                        `โหมด ${getBuildMode(next).label} · ${getBuildMode(next).hint}`,
                      );
                    }}
                  >
                    {BUILD_MODES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <ChevronsUpDown size={12} />
                </label>
                <button
                  type="button"
                  className="ghost-btn"
                  aria-label="ตั้งค่าโมเดล AI"
                  title="ตั้งค่าโมเดล AI"
                  aria-expanded={showModel}
                  onClick={() => setShowModel((value) => !value)}
                >
                  <SlidersHorizontal size={15} />
                </button>
                <span className="row-spacer" />
                {speech.supported && (
                  <button
                    type="button"
                    className="ghost-btn mic-btn"
                    aria-label="พิมพ์ด้วยเสียง"
                    title="พิมพ์ด้วยเสียง"
                    aria-pressed={speech.listening}
                    disabled={busy}
                    onClick={speech.toggle}
                  >
                    <Mic size={16} />
                  </button>
                )}
                {busy ? (
                  <button
                    type="button"
                    className="send-circle running"
                    aria-label="หยุดรับผล"
                    title="หยุดรับผล"
                    onClick={(e) => {
                      e.preventDefault();
                      stop();
                    }}
                  >
                    <Square size={12} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="send-circle"
                    disabled={!prompt.trim() || !ready}
                    aria-label="ส่งคำสั่ง"
                    title="ส่งคำสั่ง (Ctrl/⌘ + Enter)"
                  >
                    <ArrowUp size={18} />
                  </button>
                )}
              </div>
            </form>
            {showModel && (
              <label className="model-field">
                Model{" "}
                <input
                  aria-label="Puter model ID"
                  placeholder="ค่าเริ่มต้นของ Puter"
                  value={model}
                  disabled={busy}
                  onChange={(e) => setModel(e.target.value)}
                />
              </label>
            )}
            <small className="billing-note">
              ใช้โควตา/ค่าบริการบัญชี Puter ของคุณ · Ctrl/⌘ + Enter เพื่อส่ง ·
              ไม่ส่งคำสั่งอัตโนมัติ
            </small>
          </div>
        </aside>
        <section className="work-panel">
          {/* แท็บหลัก 2 แท็บเหมือน Bolt: Preview | Code — เครื่องมือรองอยู่ขวามือ */}
          <div className="work-tabs">
            <div role="tablist" aria-label="Workspace views">
              {(
                [
                  { id: "preview", icon: Eye, label: "Preview" },
                  { id: "code", icon: Code2, label: "Code" },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  role="tab"
                  aria-selected={tab === id}
                  key={id}
                  className={tab === id ? "active" : ""}
                  onClick={() => {
                    setTab(id);
                    setMobileView("work");
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <div className="tab-side">
              <span className="sandbox-label">
                <i /> Isolated preview
              </span>
              <button
                className="icon-button"
                aria-label="เปิด Sandbox และ REPL"
                title="Sandbox · REPL"
                aria-pressed={overlay === "sandbox"}
                onClick={() =>
                  setOverlay((current) =>
                    current === "sandbox" ? null : "sandbox",
                  )
                }
              >
                <Terminal size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="เปิดประวัติโค้ด"
                title="ประวัติโค้ด"
                aria-pressed={overlay === "history"}
                onClick={() =>
                  setOverlay((current) =>
                    current === "history" ? null : "history",
                  )
                }
              >
                <History size={16} />
                {!!project.versions.length && (
                  <span className="menu-count">{project.versions.length}</span>
                )}
              </button>
            </div>
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
                <div className="preview-address">preview / {page}</div>
                <div
                  className="device-group"
                  role="group"
                  aria-label="ขนาดพรีวิว"
                >
                  {(
                    [
                      { id: "desktop", icon: Monitor, label: "Desktop preview" },
                      { id: "tablet", icon: Tablet, label: "Tablet preview" },
                      { id: "mobile", icon: Smartphone, label: "Mobile preview" },
                    ] as const
                  ).map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      aria-label={label}
                      title={label}
                      aria-pressed={device === id}
                      className={device === id ? "selected" : ""}
                      onClick={() => setDevice(id)}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={`preview-stage ${
                  device === "mobile"
                    ? "mobile-preview"
                    : device === "tablet"
                      ? "tablet-preview"
                      : ""
                }`}
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
                  <Code2 size={15} /> {draftPath}
                </span>
                <div>
                  <button
                    className="subtle"
                    disabled={!dirty || busy}
                    onClick={() => {
                      if (confirm("ยกเลิกการแก้ไขที่ยังไม่บันทึก?"))
                        setDrafts(project.files);
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className="primary"
                    disabled={!dirty || busy}
                    onClick={saveCode}
                  >
                    <Save size={14} /> บันทึกและรัน
                  </button>
                </div>
              </div>
              <div className="file-list" role="group" aria-label="ไฟล์ในโปรเจกต์">
                {Object.keys(drafts)
                  .sort((a, b) =>
                    a === draftPath
                      ? -1
                      : b === draftPath
                        ? 1
                        : a === "index.html"
                          ? -1
                          : b === "index.html"
                            ? 1
                            : a.localeCompare(b),
                  )
                  .map((path) => (
                    <button
                      key={path}
                      aria-pressed={path === draftPath}
                      onClick={() => setDraftPath(path)}
                    >
                      {path}
                    </button>
                  ))}
              </div>
              <textarea
                className="code-editor"
                aria-label={`${draftPath} source code`}
                spellCheck={false}
                value={drafts[draftPath] ?? ""}
                disabled={busy}
                onChange={(e) =>
                  setDrafts({ ...drafts, [draftPath]: e.target.value })
                }
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                    e.preventDefault();
                    saveCode();
                  }
                }}
              />
              <div className="code-footnote">
                {(drafts[draftPath] ?? "").split("\n").length} lines ·{" "}
                {((drafts[draftPath] ?? "").length / 1000).toFixed(1)} KB ·{" "}
                {Object.keys(drafts).length} ไฟล์ · Ctrl/⌘ + S
                เพื่อบันทึกและอัปเดตพรีวิว
              </div>
            </div>
          )}
          {/* ── แผงลอยทับพื้นที่ขวา: Sandbox กับ History ยังอยู่ครบ แต่ไม่แย่งแท็บหลัก ── */}
          {overlay && (
            <div
              className="overlay-panel"
              role="dialog"
              aria-label={overlay === "sandbox" ? "Sandbox และ REPL" : "ประวัติโค้ด"}
            >
              <div className="overlay-head">
                <span>
                  {overlay === "sandbox" ? (
                    <>
                      <Terminal size={15} /> Sandbox · รันและทดลองโค้ด
                    </>
                  ) : (
                    <>
                      <History size={15} /> ประวัติโค้ด{" "}
                      <small>{project.versions.length}/8</small>
                    </>
                  )}
                </span>
                <button
                  className="icon-button"
                  aria-label="ปิดแผง"
                  onClick={() => setOverlay(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overlay-body">
                {overlay === "sandbox" ? (
                  <SandboxPanel
                    html={inlineAssets(
                      project.files[page] ?? "",
                      project.files,
                    )}
                  />
                ) : (
                  <div className="history-panel">
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
                                  version.files,
                                  "ก่อนกู้คืนเวอร์ชัน",
                                ),
                              );
                              showTab("preview");
                              setError("");
                            } catch (e) {
                              setError(errorText(e));
                            }
                          }}
                        >
                          <RotateCcw size={14} /> กู้คืน
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="console-section">
            <button
              className="console-toggle"
              onClick={() => setShowLogs(!showLogs)}
              aria-expanded={showLogs}
            >
              <Terminal size={14} /> Console <span>{logs.length}</span>
              <span className="console-status">
                {busy ? "Building…" : status || "พร้อมใช้งาน"}
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
      <footer className="workspace-footer">
        <span>
          <Play size={11} /> Browser sandbox · ไม่มีสิทธิ์เข้าถึงบัญชี Puter
        </span>
        <span>Local storage · Export เพื่อสำรองงาน</span>
      </footer>
    </div>
  );
}
function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: string; error?: { message?: string } };
    return (
      e.message ||
      e.error?.message ||
      "Puter ส่งข้อผิดพลาด กรุณาตรวจบัญชี โควตา และ model ID"
    );
  }
  return String(error);
}

/**
 * การ์ดกิจกรรมระหว่าง/หลังสร้าง เลียนแบบแชทของ Bolt:
 * บน = การ์ดไฟล์ที่อ่าน/เขียน (พับได้) ล่าง = การ์ดแผนงาน 5 ขั้น
 * ⚠️ ทุกขั้นผูกกับเหตุการณ์จริงใน build() ไม่ใช่แอนิเมชันหลอก:
 * 1 อ่านโค้ดปัจจุบัน → 2 เชื่อมต่อ Puter AI → 3 รับโค้ดครบ →
 * 4 ตรวจ HTML สมบูรณ์ → 5 บันทึกเวอร์ชัน/อัปเดตพรีวิว
 */
const PLAN_STEPS = [
  "อ่านไฟล์ปัจจุบันของโปรเจกต์",
  "ส่งคำสั่งให้ Puter AI",
  "รับโค้ดชุดใหม่",
  "ตรวจความสมบูรณ์ของ HTML",
  "บันทึกเวอร์ชันและอัปเดตพรีวิว",
] as const;

function BuildActivity({
  plan,
  reads,
  open,
  onToggle,
}: {
  plan: Plan;
  reads: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const writes = plan.writes ?? [];
  const shownReads = reads.slice(0, 5);
  return (
    <div className="activity-stack">
      <div className="action-card">
        <button className="action-head" aria-expanded={open} onClick={onToggle}>
          <Eye size={15} /> {reads.length} ไฟล์ที่อ่าน
          {writes.length > 0 && ` · ${writes.length} ไฟล์ที่เขียน`}
          <ChevronDown size={15} className={open ? "flipped" : ""} />
        </button>
        {open && (
          <div className="action-rows">
            {shownReads.map((path) => (
              <span key={`r-${path}`} className="action-row">
                <Eye size={13} /> อ่าน <code>{path}</code>
              </span>
            ))}
            {reads.length > shownReads.length && (
              <span className="action-row">… อีก {reads.length - shownReads.length} ไฟล์</span>
            )}
            {writes.map((path) => (
              <span key={`w-${path}`} className="action-row">
                <Pencil size={13} /> เขียน <code>{path}</code>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="plan-card">
        <span className="plan-head">
          <ListChecks size={15} /> วางแผน
        </span>
        <ol>
          {PLAN_STEPS.map((label, i) => {
            const done = plan.step > i;
            const live = plan.live && plan.step === i;
            return (
              <li key={label} className={done ? "done" : live ? "live" : ""}>
                {done ? (
                  <CheckCircle2 size={15} />
                ) : live ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <Circle size={15} />
                )}
                {i === 2 && plan.chars > 0
                  ? `รับโค้ดชุดใหม่ · ${plan.chars.toLocaleString()} ตัวอักษร`
                  : label}
              </li>
            );
          })}
          {plan.step >= 5 && !plan.live && !plan.error && (
            <li className="done final">
              <Check size={15} /> แผนงานเสร็จสมบูรณ์
            </li>
          )}
          {plan.error && (
            <li className="failed">
              <XCircle size={15} /> {plan.error}
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
