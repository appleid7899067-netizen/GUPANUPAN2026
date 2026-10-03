"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Code2,
  Folder,
  Gamepad2,
  Github,
  Globe,
  Lightbulb,
  Mic,
  Plus,
  Rocket,
  Trash2,
  Zap,
} from "lucide-react";
import {
  createProject,
  listProjects,
  PROJECT_PREFIX,
  saveProject,
  type BuildProject,
} from "@/lib/builder";
import GithubCloneDialog, {
  type GithubCloneResult,
} from "./GithubCloneDialog";
import PuterAccountButton from "./PuterAccountButton";
import { useSpeechInput } from "./use-speech-input";
import "./builder.css";

/**
 * ═══ หน้า 1 จาก 2 หน้าของบิลเดอร์ (รูปแบบเดียวกับ bolt.new) ══════════════
 *
 * จอแรกแบบ Bolt: การ์ดฮีโร่สีน้ำเงินเต็มจอที่มีหัวข้อใหญ่ + กล่องพรอมป์สีเข้ม
 * แถวปุ่มกลม (+ / ไอเดีย / ส่ง) +ไทล์เลือกประเภทงาน 4 ช่อง + "หรือเริ่มจาก"
 * เลื่อนลงมาเจอรายการโปรเจกต์ที่เก็บในเบราว์เซอร์นี้
 *
 * ⚠️ ห้ามเรียก AI จากหน้านี้เด็ดขาด — ทุกคำขอที่เสียโควตาต้องเกิดจากการกด
 * ในหน้าเวิร์กสเปซ (`BuilderWorkspace.tsx`) เท่านั้น
 */

/** ไอเดียตัวอย่าง — กดเพื่อเติมข้อความลงช่องพรอมป์ ไม่ได้ส่งคำสั่งเอง */
const STARTER_IDEAS = [
  "เว็บร้านกาแฟสไตล์มินิมอล",
  "แดชบอร์ดรายรับรายจ่ายแบบทดลอง",
  "พอร์ตโฟลิโอช่างภาพ",
  "แอปจัดการงานพร้อมตัวกรอง",
] as const;

/** ไทล์เลือกประเภทงานล่วงหน้า = โหมดการเขียนของ `lib/build-modes.ts` */
const START_TILES = [
  { mode: "web-app", label: "เว็บแอป", icon: Globe },
  { mode: "landing", label: "แลนดิ้ง", icon: Rocket },
  { mode: "dashboard", label: "แดชบอร์ด", icon: BarChart3 },
  { mode: "game", label: "เกม", icon: Gamepad2 },
] as const;

/**
 * เวลาแบบสั้นสไตล์ Bolt ("3 ชั่วโมงที่แล้ว") — ภาษาไทยเสมอ ไม่ขึ้นกับ locale
 * ของเครื่อง รายการโปรเจกต์เรนเดอร์หลัง mount เท่านั้น จึงไม่มีปัญหา SSR ไม่ตรงกัน
 */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "เมื่อวาน" : `${days} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BuilderHome() {
  const router = useRouter();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [tile, setTile] = useState<string | null>(null);
  const [projects, setProjects] = useState<BuildProject[]>([]);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const speech = useSpeechInput((text) =>
    setPrompt((current) => (current.trim() ? `${current} ${text}` : text)),
  );
  useEffect(() => {
    try {
      setProjects(listProjects());
    } catch {
      setError(
        "เปิด browser storage ไม่ได้ โปรดอนุญาตการเก็บข้อมูลก่อนสร้างโปรเจกต์",
      );
    }
  }, []);
  /** สร้างโปรเจกต์ใน localStorage (จำโหมดที่เลือกจากไทล์ไว้) แล้วพาไปหน้าเวิร์กสเปซ */
  function start(text: string, modeId?: string | null) {
    try {
      const project = createProject(text);
      saveProject(project);
      if (modeId) {
        localStorage.setItem(`gupan:mode:${project.id}`, modeId);
      }
      if (text.trim())
        sessionStorage.setItem(`gupan:prompt:${project.id}`, text.trim());
      router.push(`/build/${project.id}`);
    } catch {
      setError(
        "บันทึกโปรเจกต์ไม่ได้ พื้นที่เบราว์เซอร์อาจเต็มหรือปิดการเก็บข้อมูลอยู่",
      );
    }
  }
  /**
   * สร้างโปรเจกต์ใหม่จาก repo ที่โคลนมา — ไฟล์มาจาก GitHub ทั้งชุด
   * และบันทึกข้อความสรุปไว้ในการสนทนา เพื่อให้รู้ที่มาโดยไม่ต้องเรียก AI
   */
  function importClone({ plan }: GithubCloneResult) {
    try {
      const base = createProject(plan.name);
      const project: BuildProject = {
        ...base,
        name: plan.name || base.name,
        files: plan.files,
        origin: plan.origin,
        messages: [{ role: "assistant", content: plan.summary }],
        updatedAt: new Date().toISOString(),
      };
      saveProject(project);
      setCloneOpen(false);
      router.push(`/build/${project.id}`);
    } catch {
      setCloneOpen(false);
      setError(
        "บันทึกโปรเจกต์จาก GitHub ไม่ได้ พื้นที่เบราว์เซอร์อาจเต็ม — ลองลบโปรเจกต์เก่าก่อน",
      );
    }
  }
  function remove(project: BuildProject) {
    if (!confirm(`ลบ “${project.name}” จากเบราว์เซอร์นี้? ย้อนกลับไม่ได้`))
      return;
    try {
      localStorage.removeItem(PROJECT_PREFIX + project.id);
      setProjects(listProjects());
    } catch {
      setError("ลบไม่สำเร็จ");
    }
  }
  function randomIdea() {
    const idea = STARTER_IDEAS[Math.floor(Math.random() * STARTER_IDEAS.length)];
    setPrompt(`สร้าง${idea} เป็นภาษาไทย ใช้งานบนมือถือได้`);
    promptRef.current?.focus();
  }
  function focusPrompt() {
    promptRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    promptRef.current?.focus({ preventScroll: true });
  }
  const tileLabel = START_TILES.find((item) => item.mode === tile)?.label;
  return (
    <div className="builder home">
      {/* ── แถบบน: โลโก้ซ้าย · บัญชี Puter + ปุ่มเริ่มเลยขวา ─────────────── */}
      <header className="builder-header">
        <Link href="/" className="brand" aria-label="GUPAN Studio หน้าหลัก">
          <Zap size={21} fill="currentColor" /> GUPAN<span>studio</span>
        </Link>
        <div className="header-actions">
          <PuterAccountButton
            onStatus={(message) => {
              setError("");
              setNotice(message);
            }}
            onError={(message) => {
              setNotice("");
              setError(message);
            }}
          />
          <button className="primary" onClick={focusPrompt}>
            เริ่มเลย
          </button>
        </div>
      </header>

      <main className="home-main">
        {/* ── การ์ดฮีโร่สีน้ำเงินแบบ bolt.new ───────────────────────────── */}
        <section className="home-hero-card">
          <h1>วันนี้คุณจะสร้างอะไร?</h1>
          <p className="hero-sub">
            สร้างแอปและเว็บไซต์ที่ใช้งานได้จริง ด้วยการคุยกับ AI
          </p>

          <form
            className="prompt-card"
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) start(prompt, tile);
            }}
          >
            <textarea
              ref={promptRef}
              aria-label="อธิบายเว็บที่อยากสร้าง"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="เล่าไอเดียของคุณ เช่น เว็บร้านกาแฟที่มีเมนูและตะกร้า…"
              maxLength={6000}
            />
            <div className="composer-row">
              <button
                type="button"
                className="round-btn"
                aria-label="สร้างโปรเจกต์เปล่า"
                title="สร้างโปรเจกต์เปล่า"
                onClick={() => start("", tile)}
              >
                <Plus size={17} />
              </button>
              <button
                type="button"
                className="ghost-btn"
                aria-label="สุ่มไอเดียตัวอย่าง"
                title="สุ่มไอเดียตัวอย่าง"
                onClick={randomIdea}
              >
                <Lightbulb size={16} />
              </button>
              <span className="prompt-pill">{tileLabel || "HTML · CSS · JS"}</span>
              {speech.supported && (
                <button
                  type="button"
                  className="ghost-btn mic-btn"
                  aria-label="พิมพ์ด้วยเสียง"
                  title="พิมพ์ด้วยเสียง"
                  aria-pressed={speech.listening}
                  onClick={speech.toggle}
                >
                  <Mic size={16} />
                </button>
              )}
              <button
                className="send-circle"
                type="submit"
                disabled={!prompt.trim()}
                aria-label="เริ่มสร้าง"
                title="เริ่มสร้าง"
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </form>

          <div className="start-tiles" role="group" aria-label="เลือกประเภทงาน">
            {START_TILES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                className="start-tile"
                aria-pressed={tile === mode}
                onClick={() => setTile((current) => (current === mode ? null : mode))}
              >
                <span className="tile-box">
                  <Icon size={26} />
                </span>
                {label}
              </button>
            ))}
          </div>

          <p className="start-from">หรือเริ่มจาก</p>
          <div className="suggestions">
            <button
              type="button"
              className="suggestion-github"
              onClick={() => setCloneOpen(true)}
            >
              <Github size={13} /> โคลนจาก GitHub <ArrowUpRight size={12} />
            </button>
            {STARTER_IDEAS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => {
                  setPrompt(`สร้าง${text} เป็นภาษาไทย ใช้งานบนมือถือได้`);
                  promptRef.current?.focus();
                }}
              >
                {text} <ArrowUpRight size={12} />
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="builder-error" role="alert">
            {error}
          </div>
        )}
        {notice && !error && (
          <div className="builder-notice" role="status">
            {notice}
          </div>
        )}

        <p className="honest-note">
          AI ต้องใช้บัญชี Puter และอยู่ภายใต้โควตา/ค่าบริการของผู้ให้บริการ
          <br />
          โปรเจกต์เก็บในเบราว์เซอร์นี้ · พรีวิวเว็บฝั่งหน้า ไม่ใช่ Node.js
          server หรือฐานข้อมูล
        </p>

        {/* ── Your projects: รายการแบบแถวเหมือน bolt.new ──────────────────── */}
        <section className="projects">
          <div className="section-heading">
            <h2>
              <Folder size={18} /> โปรเจกต์ของคุณ{" "}
              <small>{projects.length}</small>
            </h2>
            <button className="subtle" onClick={() => start("")}>
              <Plus size={15} /> โปรเจกต์ใหม่
            </button>
          </div>
          {!projects.length ? (
            <div className="empty-projects">
              <Code2 size={28} />
              <p>พื้นที่สำหรับไอเดียถัดไปของคุณ</p>
              <span>
                เริ่มด้วยคำสั่งด้านบน หรือเปิดโปรเจกต์เปล่าเพื่อเขียนโค้ดเอง
              </span>
            </div>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <article key={project.id} className="project-row">
                  <Link href={`/build/${project.id}`}>
                    <span className="project-thumb" aria-hidden="true">
                      <Code2 size={16} />
                    </span>
                    <span className="project-meta">
                      <strong>{project.name}</strong>
                      <small>
                        {timeAgo(project.updatedAt)} ·{" "}
                        {project.messages.length
                          ? `${project.messages.length} ข้อความ`
                          : "ยังไม่เคยสั่ง AI"}
                      </small>
                    </span>
                    <span className="project-go" aria-hidden="true">
                      <ArrowUpRight size={15} />
                    </span>
                  </Link>
                  <button
                    className="delete-project"
                    aria-label={`ลบ ${project.name}`}
                    onClick={() => remove(project)}
                  >
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="home-footer">
        GUPAN Studio <span>สร้าง · ทดลอง · ปรับปรุง</span>
        <span>ต้องการ full-stack? ตั้งค่า Totalum บนเซิร์ฟเวอร์</span>
      </footer>

      {cloneOpen && (
        <GithubCloneDialog
          mode="new"
          onClose={() => setCloneOpen(false)}
          onImport={importClone}
        />
      )}
    </div>
  );
}
