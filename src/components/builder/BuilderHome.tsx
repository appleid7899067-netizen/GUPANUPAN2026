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
import "./builder.css";

export default function BuilderHome() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<BuildProject[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      setProjects(listProjects());
    } catch {
      setError(
        "เปิด browser storage ไม่ได้ โปรดอนุญาตการเก็บข้อมูลก่อนสร้างโปรเจกต์",
      );
    }
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
  return (
    <div className="builder home">
      <header className="builder-header">
        <Link href="/" className="brand">
          <Zap size={21} fill="currentColor" /> GUPAN<span>studio</span>
        </Link>
        <span className="mode-pill">
          <i /> Puter · Frontend builder
        </span>
      </header>
      <main className="home-main">
        <div className="eyebrow">
          <Sparkles size={14} /> FROM IDEA TO INTERACTIVE
        </div>
        <h1>
          อยากสร้างอะไร
          <br />
          <span>เริ่มจากไอเดียของคุณ</span>
        </h1>
        <p className="hero-description">
          บอกสิ่งที่อยากได้ ให้ AI ช่วยเขียนโค้ด แล้วดูเว็บจริงข้าง ๆ
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
            placeholder="สร้างเว็บร้านกาแฟ มีเมนู ราคา และตะกร้าสั่งซื้อ…"
            maxLength={6000}
          />
          <div className="prompt-footer">
            <span>
              <Code2 size={15} /> HTML · CSS · JavaScript
            </span>
            <button className="primary" disabled={!prompt.trim()} type="submit">
              เริ่มสร้าง <ArrowUp size={17} />
            </button>
          </div>
        </form>
        <div className="suggestions">
          {[
            "เว็บร้านกาแฟสไตล์มินิมอล",
            "แดชบอร์ดรายรับรายจ่ายแบบทดลอง",
            "พอร์ตโฟลิโอช่างภาพ",
            "แอปจัดการงานพร้อมตัวกรอง",
          ].map((text) => (
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
        <p className="honest-note">
          AI ต้องใช้บัญชี Puter และอยู่ภายใต้โควตา/ค่าบริการของผู้ให้บริการ
          <br />
          โปรเจกต์เก็บในเบราว์เซอร์นี้ · พรีวิวเว็บฝั่งหน้า ไม่ใช่ Node.js
          server หรือฐานข้อมูล
        </p>
        <section className="projects">
          <div className="section-heading">
            <h2>
              <Folder size={18} /> โปรเจกต์ของคุณ{" "}
              <small>{projects.length}</small>
            </h2>
            <button className="subtle" onClick={() => start("")}>
              <Plus size={15} /> โปรเจกต์เปล่า
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
            <div className="project-grid">
              {projects.map((project) => (
                <article key={project.id} className="project-card">
                  <Link href={`/build/${project.id}`}>
                    <div className="project-art">
                      <Code2 size={30} />
                    </div>
                    <h3>{project.name}</h3>
                    <p>{new Date(project.updatedAt).toLocaleString("th-TH")}</p>
                  </Link>
                  <button
                    className="delete-project"
                    aria-label={`ลบ ${project.name}`}
                    onClick={() => {
                      if (
                        confirm(
                          `ลบ “${project.name}” จากเบราว์เซอร์นี้? ย้อนกลับไม่ได้`,
                        )
                      ) {
                        try {
                          localStorage.removeItem(PROJECT_PREFIX + project.id);
                          setProjects(listProjects());
                        } catch {
                          setError("ลบไม่สำเร็จ");
                        }
                      }
                    }}
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
