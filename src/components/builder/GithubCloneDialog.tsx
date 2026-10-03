"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileCode2,
  Github,
  Loader2,
  Star,
  X,
} from "lucide-react";
import {
  GitHubImportError,
  fetchRepoImport,
  planImport,
  type ImportPlan,
  type RepoImportPayload,
} from "@/lib/github-import";

/**
 * ═══ dialog "โคลนจาก GitHub" ══════════════════════════════════════════
 *
 * ใช้ได้สองที่:
 *  - หน้าหลัก (`mode="new"`)     → สร้างโปรเจกต์ใหม่จาก repo
 *  - เวิร์กสเปซ (`mode="replace"`) → แทนที่ไฟล์ของโปรเจกต์ที่เปิดอยู่ (มี checkpoint)
 *
 * ขั้นตอน: ผู้ใช้กด "โหลด repo" → ยิง `/api/github/import` (เซิร์ฟเวอร์โหลด tarball
 * เองเพราะ codeload ไม่ให้ CORS) → `planImport()` ตัดสินใจไฟล์ที่จะเข้าโปรเจกต์
 * → แสดงตัวอย่างให้ตรวจก่อนกดยืนยัน ไม่มี AI/เครดิตเกี่ยวข้องเลย
 */

export interface GithubCloneResult {
  plan: ImportPlan;
  payload: RepoImportPayload;
  /** ข้อความที่ผู้ใช้กรอก (ใช้ตั้งชื่อ/บันทึกว่ามาจากไหน) */
  input: string;
}

const EXAMPLES = [
  "startbootstrap/startbootstrap-agency",
  "octocat/Hello-World",
];

export default function GithubCloneDialog({
  mode,
  onClose,
  onImport,
}: {
  mode: "new" | "replace";
  onClose: () => void;
  onImport: (result: GithubCloneResult) => void;
}) {
  const [input, setInput] = useState("");
  const [subpath, setSubpath] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GithubCloneResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      abortRef.current?.abort();
    };
  }, [loading, onClose]);

  // นาฬิกาไว้บอกผู้ใช้ว่ายังทำงานอยู่ (ดาวน์โหลด tarball ไม่มี progress จริงจากเซิร์ฟเวอร์)
  useEffect(() => {
    if (!loading) {
      setSeconds(0);
      return;
    }
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  async function load(repoInput: string) {
    const target = repoInput.trim();
    if (!target || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 120_000);
    try {
      const payload = await fetchRepoImport(target, {
        signal: controller.signal,
        subpath: subpath.trim() || undefined,
      });
      const plan = planImport(payload);
      setResult({ plan, payload, input: target });
    } catch (cause) {
      if (controller.signal.aborted) {
        setError("ใช้เวลานานเกิน 2 นาที — ลองระบุโฟลเดอร์ย่อยหรือ repo ที่เล็กลง");
      } else if (cause instanceof GitHubImportError) {
        setError(cause.message);
      } else {
        setError("โคลนไม่สำเร็จ — ตรวจการเชื่อมต่อแล้วลองใหม่");
      }
    } finally {
      window.clearTimeout(timeout);
      abortRef.current = null;
      setLoading(false);
    }
  }

  const meta = result?.payload.meta;
  const plan = result?.plan;

  return (
    <div
      className="publish-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="โคลนโปรเจกต์จาก GitHub"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="publish-dialog clone-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <span>
            <Github size={15} /> โคลนจาก GitHub
          </span>
          <button
            className="icon-button"
            aria-label="ปิด"
            disabled={loading}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <p className="publish-note">
          รองรับ <strong>repo สาธารณะ</strong> — โหลดไฟล์ข้อความ (HTML/CSS/JS/MD…)
          เข้าโปรเจกต์ให้แก้และพรีวิวต่อได้ ส่วนรูป/ฟอนต์จะถูกอ้างด้วย URL ของ GitHub
          โดยตรง ไม่มี AI หรือเครดิตถูกใช้ในขั้นตอนนี้
        </p>

        <form
          className="clone-form"
          onSubmit={(event) => {
            event.preventDefault();
            void load(input);
          }}
        >
          <div className="clone-field">
            <Github size={14} />
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="owner/repo หรือ https://github.com/owner/repo"
              aria-label="URL หรือชื่อ repo GitHub"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="clone-field clone-field-sub">
            <FileCode2 size={14} />
            <input
              value={subpath}
              onChange={(event) => setSubpath(event.target.value)}
              placeholder="โฟลเดอร์ย่อย (ไม่บังคับ) เช่น examples/blog"
              aria-label="โฟลเดอร์ย่อยใน repo"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="clone-examples">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="subtle clone-example"
                onClick={() => {
                  setInput(example);
                  void load(example);
                }}
              >
                {example}
              </button>
            ))}
          </div>
          <button className="primary" type="submit" disabled={loading || !input.trim()}>
            {loading ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            {loading ? "กำลังโคลน…" : "โหลด repo"}
          </button>
        </form>

        {loading && (
          <p className="publish-progress" role="status">
            กำลังดาวน์โหลดและคัดแยกไฟล์… {seconds}s
            {seconds > 12 ? " · repo ใหญ่ใช้เวลานานหน่อย" : ""}
          </p>
        )}

        {!!error && (
          <div className="builder-error" role="alert">
            {error}
          </div>
        )}

        {meta && plan && (
          <div className="clone-result">
            <div className="clone-meta">
              <strong>
                {meta.owner}/{meta.repo}
              </strong>
              <span className="clone-chip">ref {meta.ref}</span>
              {meta.language && <span className="clone-chip">{meta.language}</span>}
              {meta.license && <span className="clone-chip">{meta.license}</span>}
              {typeof meta.stars === "number" && meta.stars > 0 && (
                <span className="clone-chip">
                  <Star size={11} /> {meta.stars.toLocaleString("th-TH")}
                </span>
              )}
              {meta.subpath && <span className="clone-chip">{meta.subpath}</span>}
            </div>
            {meta.description && <p className="clone-desc">{meta.description}</p>}

            <p className="clone-stats">
              <Check size={13} /> นำเข้า <strong>{plan.kept.length}</strong> ไฟล์ ≈{" "}
              {Math.max(1, Math.round(plan.totalBytes / 1024))} KB · หน้าแรก{" "}
              <code>{plan.entry}</code>
              {plan.dropped.length > 0 && <> · ข้าม {plan.dropped.length} ไฟล์</>}
            </p>

            {plan.warnings.length > 0 && (
              <ul className="clone-warnings">
                {plan.warnings.map((warning) => (
                  <li key={warning}>
                    <AlertTriangle size={12} /> {warning}
                  </li>
                ))}
              </ul>
            )}

            <details className="clone-files">
              <summary>ดูไฟล์ที่จะนำเข้า ({plan.kept.length})</summary>
              <ul>
                {plan.kept.map((file) => (
                  <li key={file.path}>
                    <code>{file.path}</code>
                    <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
                  </li>
                ))}
                {plan.dropped.slice(0, 40).map((item) => (
                  <li key={`${item.path}-${item.reason}`} className="dim">
                    <code>{item.path}</code>
                    <span>{item.reason}</span>
                  </li>
                ))}
              </ul>
              {plan.dropped.length > 40 && (
                <p className="publish-note">
                  …และอีก {plan.dropped.length - 40} ไฟล์ที่ถูกข้าม
                </p>
              )}
            </details>

            <div className="publish-actions">
              <button className="primary" onClick={() => onImport(result)}>
                <Github size={15} />
                {mode === "new" ? "สร้างโปรเจกต์จาก repo นี้" : "แทนที่ไฟล์ในโปรเจกต์นี้"}
              </button>
              <button className="subtle" onClick={onClose}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
