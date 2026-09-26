"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  FolderOpen,
  Loader2,
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
import { refreshPuterSession, type PuterAuthState } from "@/lib/puter";
import PuterAuthPanel from "./PuterAuthPanel";
import "./builder.css";

const SUGGESTIONS = [
  {
    icon: "☕",
    title: "เว็บร้านกาแฟ",
    detail: "เมนู ราคา ตะกร้าสั่งซื้อ",
    prompt: "สร้างเว็บร้านกาแฟสไตล์มินิมอล มีเมนู ราคา และตะกร้าสั่งซื้อทดลอง เป็นภาษาไทย ใช้งานบนมือถือได้",
  },
  {
    icon: "📊",
    title: "แดชบอร์ดรายรับรายจ่าย",
    detail: "กราฟ สรุปยอด ตัวกรอง",
    prompt: "สร้างแดชบอร์ดรายรับรายจ่ายแบบทดลอง มีกราฟแท่ง สรุปยอด และตัวกรองเดือน เป็นภาษาไทย ใช้งานบนมือถือได้",
  },
  {
    icon: "📸",
    title: "พอร์ตโฟลิโอช่างภาพ",
    detail: "แกลเลอรี ไลท์บ็อกซ์",
    prompt: "สร้างเว็บพอร์ตโฟลิโอช่างภาพ มีแกลเลอรีรูป ไลท์บ็อกซ์ และหน้าติดต่อ เป็นภาษาไทย ใช้งานบนมือถือได้",
  },
  {
    icon: "✅",
    title: "แอปจัดการงาน",
    detail: "เพิ่มงาน ตัวกรอง ค้นหา",
    prompt: "สร้างแอปจัดการงาน todo มีเพิ่ม ลบ ติ๊กเสร็จ ตัวกรองและค้นหา เป็นภาษาไทย ใช้งานบนมือถือได้",
  },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "เมื่อสักครู่";
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชม. ที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH");
}

export default function BuilderHome() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<BuildProject[]>([]);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState<PuterAuthState>({ status: "loading" });
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    try {
      setProjects(listProjects());
    } catch {
      setError(
        "เปิด browser storage ไม่ได้ โปรดอนุญาตการเก็บข้อมูลก่อนสร้างโปรเจกต์",
      );
    }
    let alive = true;
    refreshPuterSession().then((s) => {
      if (alive) setAuth(s);
    });
    return () => {
      alive = false;
    };
  }, []);

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

  function removeProject(project: BuildProject) {
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
      <div className="home-glow" aria-hidden />
      <header className="builder-header home-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Zap size={16} fill="currentColor" />
          </span>
          GUPAN<span>studio</span>
        </Link>
        <button
          className={`auth-chip ${auth.status === "signed-in" ? "in" : ""}`}
          onClick={() => setShowAuth((v) => !v)}
          aria-expanded={showAuth}
        >
          {auth.status === "loading" ? (
            <>
              <Loader2 size={13} className="spin" /> กำลังเชื่อมต่อ…
            </>
          ) : auth.status === "signed-in" ? (
            <>
              <CheckCircle2 size={13} /> {auth.username || "Puter"}
            </>
          ) : (
            <>
              <span className="dot" /> เข้าสู่ระบบ
            </>
          )}
        </button>
      </header>

      {showAuth && (
        <div className="home-auth-drop">
          <PuterAuthPanel auth={auth} onChange={setAuth} compact />
        </div>
      )}

      <main className="home-main">
        <div className="eyebrow">
          <Sparkles size={13} /> AI WEB BUILDER · ภาษาไทย
        </div>
        <h1>
          อยากสร้างอะไร
          <br />
          <span>พิมพ์ แล้วดูเว็บเกิดตรงหน้า</span>
        </h1>
        <p className="hero-description">
          บอกไอเดียเป็นภาษาไทย AI เขียนโค้ดให้ แล้วลองเล่นเว็บจริงได้ทันที
        </p>

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
            placeholder="เช่น สร้างเว็บร้านชานม มีเมนูพร้อมรูป ราคา และปุ่มสั่งผ่านไลน์…"
            maxLength={6000}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (prompt.trim()) start(prompt);
              }
            }}
          />
          <div className="prompt-footer">
            <span className="prompt-meta">
              <Code2 size={14} /> HTML · CSS · JS
            </span>
            <span className="prompt-hint">Ctrl/⌘ + Enter</span>
            <button className="primary send-btn" disabled={!prompt.trim()} type="submit">
              เริ่มสร้าง
              <span className="send-arrow">
                <ArrowUp size={16} />
              </span>
            </button>
          </div>
        </form>

        <div className="suggestions" role="list">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              role="listitem"
              className="suggestion-card"
              onClick={() => setPrompt(s.prompt)}
              aria-label={`ใช้ตัวอย่าง ${s.title}`}
            >
              <span className="suggestion-icon" aria-hidden>
                {s.icon}
              </span>
              <span className="suggestion-text">
                <b>{s.title}</b>
                <small>{s.detail}</small>
              </span>
              <ChevronRight size={14} className="suggestion-go" />
            </button>
          ))}
        </div>

        {error && (
          <div className="builder-error" role="alert">
            {error}
            <button aria-label="ปิดข้อความผิดพลาด" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        <p className="honest-note">
          AI ใช้บัญชี Puter และโควตาของคุณ · ไม่ส่งคำสั่งอัตโนมัติ
          <br />
          โปรเจกต์เก็บในเบราว์เซอร์นี้ · Export ZIP เพื่อสำรองงาน
        </p>

        <section className="projects" aria-label="โปรเจกต์ของคุณ">
          <div className="section-heading">
            <h2>
              <FolderOpen size={17} /> โปรเจกต์ของคุณ
              <small>{projects.length}</small>
            </h2>
            <button className="subtle" onClick={() => start("")}>
              <Plus size={14} /> โปรเจกต์เปล่า
            </button>
          </div>
          {!projects.length ? (
            <div className="empty-projects">
              <Code2 size={26} />
              <p>พื้นที่สำหรับไอเดียถัดไปของคุณ</p>
              <span>
                เริ่มด้วยคำสั่งด้านบน หรือเปิดโปรเจกต์เปล่าเพื่อเขียนโค้ดเอง
              </span>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((project) => (
                <article key={project.id} className="project-card">
                  <Link
                    href={`/build/${project.id}`}
                    aria-label={`เปิด ${project.name}`}
                  >
                    <div className="project-art" aria-hidden>
                      <Code2 size={28} />
                    </div>
                    <div className="project-info">
                      <h3>{project.name}</h3>
                      <p>
                        <Clock size={10} /> {timeAgo(project.updatedAt)}
                      </p>
                    </div>
                  </Link>
                  <button
                    className="delete-project"
                    aria-label={`ลบ ${project.name}`}
                    onClick={() => removeProject(project)}
                  >
                    <Trash2 size={14} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="home-footer">
        <span className="foot-brand">
          <Zap size={11} fill="currentColor" /> GUPAN Studio
        </span>
        <span>สร้าง · ทดลอง · ปรับปรุง</span>
        <span className="foot-right">ต้องการ full-stack? ตั้งค่า Totalum บนเซิร์ฟเวอร์</span>
      </footer>
    </div>
  );
}
