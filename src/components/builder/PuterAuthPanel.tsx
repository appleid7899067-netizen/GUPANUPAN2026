"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import {
  refreshPuterSession,
  signInWithPuter,
  signOutFromPuter,
  PuterAuthError,
  type PuterAuthState,
} from "@/lib/puter";

type Props = {
  auth: PuterAuthState;
  onChange: (next: PuterAuthState) => void;
  compact?: boolean;
};

/**
 * Bolt-style Puter login card. The sign-in call happens synchronously inside
 * the button's onClick so mobile browsers keep the popup gesture.
 */
export default function PuterAuthPanel({ auth, onChange, compact }: Props) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  async function recheck() {
    setWorking(true);
    setError("");
    try {
      onChange(await refreshPuterSession());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  }

  // NOTE: do not await anything before signInWithPuter() — popup needs gesture.
  function handleSignIn() {
    if (working) return;
    setWorking(true);
    setError("");
    signInWithPuter().then(
      (username) => {
        setWorking(false);
        onChange({ status: "signed-in", username });
      },
      (e: unknown) => {
        setWorking(false);
        // A dismissed popup leaves the session signed-out; keep state in sync.
        onChange({ status: "signed-out" });
        setError(
          e instanceof PuterAuthError
            ? e.message
            : e instanceof Error
              ? e.message
              : "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง",
        );
        if (e instanceof PuterAuthError && e.code !== "unknown") {
          setHelpOpen(true);
        }
      },
    );
  }

  function handleSignOut() {
    signOutFromPuter();
    onChange({ status: "signed-out" });
  }

  if (auth.status === "loading") {
    return (
      <div className="auth-card auth-loading" role="status">
        <Loader2 size={16} className="spin" />
        <span>กำลังเชื่อมต่อ Puter…</span>
      </div>
    );
  }

  if (auth.status === "unavailable") {
    return (
      <div className="auth-card auth-error" role="alert">
        <div className="auth-row">
          <WifiOff size={16} />
          <div>
            <strong>เชื่อมต่อ Puter ไม่ได้</strong>
            <p>{auth.detail}</p>
          </div>
        </div>
        <button className="auth-btn" onClick={() => void recheck()} disabled={working}>
          {working ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          ลองเชื่อมต่ออีกครั้ง
        </button>
        <p className="auth-hint">แก้โค้ดและดูพรีวิวได้ตามปกติโดยไม่ต้องล็อกอิน</p>
      </div>
    );
  }

  if (auth.status === "signed-in") {
    return (
      <div className="auth-card auth-ok">
        <div className="auth-row">
          <span className="auth-avatar" aria-hidden>
            {(auth.username?.[0] || "P").toUpperCase()}
          </span>
          <div className="auth-user">
            <span className="auth-ok-badge">
              <CheckCircle2 size={13} /> เชื่อมต่อแล้ว
            </span>
            <strong>{auth.username || "Puter user"}</strong>
          </div>
          <button
            className="auth-ghost"
            onClick={handleSignOut}
            aria-label="ออกจากระบบ Puter"
            title="ออกจากระบบ Puter"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card auth-signin">
      <div className="auth-row">
        <ShieldCheck size={17} className="auth-shield" />
        <div>
          <strong>เริ่มสร้างด้วย AI</strong>
          <p>ล็อกอิน Puter ฟรีเพื่อเปิดใช้ AI — ใช้โควตาบัญชีของคุณเอง</p>
        </div>
      </div>
      <button
        className="sign-in"
        onClick={handleSignIn}
        disabled={working}
      >
        {working ? (
          <Loader2 size={15} className="spin" />
        ) : (
          <LogIn size={15} />
        )}
        {working ? "กำลังเปิดหน้าต่าง Puter…" : "เข้าสู่ระบบ Puter เพื่อใช้ AI"}
      </button>
      {!compact && (
        <button
          className="auth-recheck"
          onClick={() => void recheck()}
          disabled={working}
        >
          <RefreshCw size={12} /> ล็อกอินที่แท็บอื่นแล้ว? กดเช็คสถานะ
        </button>
      )}
      {error && (
        <div className="builder-error auth-inline-error" role="alert">
          {error}
        </div>
      )}
      <button
        className="auth-help-toggle"
        onClick={() => setHelpOpen((v) => !v)}
        aria-expanded={helpOpen}
      >
        ล็อกอินไม่ได้? ดูวิธีแก้
        <ChevronDown size={14} className={helpOpen ? "flipped" : ""} />
      </button>
      {helpOpen && (
        <ol className="auth-help">
          <li>
            แตะ <b>⋮</b> (Chrome) หรือ <b>aA</b> (Safari) → เปิด <b>อนุญาตป๊อปอัป</b>{" "}
            สำหรับเว็บนี้
          </li>
          <li>ปิด ad-blocker ชั่วคราว แล้วกดเข้าสู่ระบบอีกครั้ง</li>
          <li>
            ถ้าใช้โหมดไม่ระบุตัวตน ให้อนุญาต <b>คุกกี้ third-party</b> หรือลองเบราว์เซอร์ปกติ
          </li>
          <li>
            ยังไม่ได้ผล? เปิด <b>puter.com</b> ล็อกอินให้เสร็จ แล้วกลับมากด “เช็คสถานะ”
          </li>
        </ol>
      )}
    </div>
  );
}
