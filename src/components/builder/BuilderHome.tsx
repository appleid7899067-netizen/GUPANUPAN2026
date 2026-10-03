"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowUpRight,
  Code2,
  Folder,
  Plus,
  Sparkles,
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
import PuterAccountButton from "./PuterAccountButton";
import "./builder.css";

/**
 * ═══ หน้า 1 จาก 2 หน้าของบิลเดอร์ (รูปแบบเดียวกับ bolt.new) ══════════════
 *
 * bolt.new มีอยู่ 2 หน้า: หน้าแรกที่มีช่องพรอมป์ใหญ่กลางจอ + รายการโปรเจกต์
 * และหน้าเวิร์กสเปซ `/build/[id]` ที่มีแชตอยู่ซ้าย พรีวิว/โค้ดอยู่ขวา
 * ไฟล์นี้คือหน้าแรก ส่วน `BuilderWorkspace.tsx` คือหน้าที่สอง
 *
 * หน้าแรกทำหน้าที่เดียว: รับไอเดีย → สร้างโปรเจกต์ในเบราว์เซอร์ → พาไปหน้า 2
 * ⚠️ ห้ามเรียก AI จากหน้านี้เด็ดขาด ทุกคำขอที่เสียโควตาต้องเกิดจากผู้ใช้กด
 * ในหน้าเวิร์กสเปซเท่านั้น (ตรงกับกฎ "Never auto-submit paid requests")
 */

/** ไอเดียตัวอย่าง — กดเพื่อเติมข้อความลงช่องพรอมป์ ไม่ได้ส่งคำสั่งเอง */
const STARTER_IDEAS = [
  "เว็บร้านกาแฟสไตล์มินิมอล",
  "แดชบอร์ดรายรับรายจ่ายแบบทดลอง",
  "พอร์ตโฟลิโอช่างภาพ",
  "แอปจัดการงานพร้อมตัวกรอง",
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
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<BuildProject[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      setProjects(listProjects());
    } catch {
      setError(
        "เปิด browser storage ไม่ได้ โปรดอนุญาตการเก็บข้อมูลก่อนสร้างโปรเจกต์",
      );
    }
  }, []);
  /** สร้างโปรเจกต์ใน localStorage แล้วพาไปหน้าเวิร์กสเปซ (หน้าที่ 2) */
  function start(text: string) {
    try {
      const project = createProject(text);
      saveProject(project);
      if (text.trim())
        sessionStorage.setItem(`gupan:prompt:${project.id}`, text.trim());
      router.push(`/build/${project.id}`);
    } catch {
      setError(
        "บันทึกโปรเจกต์ไม่ได้ พื้นที่เบราว์เซอร์อาจเต็มหรือปิดการเก็บข้อมูลอยู่",
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
  return (
    <div className="builder home">
      {/* ── แถบบนแบบ Bolt: โลโก้ซ้าย · สถานะโหมด + บัญชี Puter ขวา ───────── */}
      <header className="builder-header">
        <Link href="/" className="brand" aria-label="GUPAN Studio หน้าหลัก">
          <Zap size={21} fill="currentColor" /> GUPAN<span>studio</span>
        </Link>
        <div className="header-actions">
          <span className="mode-pill">
            <i /> Puter · Frontend builder
          </span>
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
        </div>
      </header>

      <main className="home-main">
        <div className="home-hero">
          <div className="home-logo" aria-hidden="true">
            <Zap size={24} fill="currentColor" />
          </div>
          <div className="eyebrow">
            <Sparkles size={14} /> FROM IDEA TO INTERACTIVE
          </div>
          <h1>อยากสร้างอะไร?</h1>
          <p className="hero-description">
            พิมพ์ไอเดียของคุณ แล้ว AI จะเขียนโค้ดให้ ดูเว็บจริงข้าง ๆ ได้ทันที
          </p>
        </div>

        <form
          className="prompt-card"
          onSubmit={(e) => {
            e.preventDefault();
            if (prompt.trim()) start(prompt);
          }}
        >
          <textarea
            aria-label="อธิบายเว็บที่อยากสร้าง"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="สร้างเว็บร้านกาแฟ มีเมนู ราคา และตะกร้าสั่งซื้อ…"
            maxLength={6000}
          />
          <div className="prompt-footer">
            <span className="prompt-pill">
              <Code2 size={15} /> HTML · CSS · JavaScript
            </span>
            <button
              className="send-button"
              type="submit"
              disabled={!prompt.trim()}
              aria-label="เริ่มสร้าง"
              title="เริ่มสร้าง"
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </form>

        <div className="suggestions">
          {STARTER_IDEAS.map((text) => (
            <button
              key={text}
              onClick={() =>
                setPrompt(`สร้าง${text} เป็นภาษาไทย ใช้งานบนมือถือได้`)
              }
            >
              {text} <ArrowUpRight size={12} />
            </button>
          ))}
        </div>

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
    </div>
  );
}
