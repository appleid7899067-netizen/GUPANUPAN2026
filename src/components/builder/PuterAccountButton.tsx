"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ClipboardCopy, KeyRound, Loader2, LogIn, LogOut, ShieldAlert } from "lucide-react";
import {
  ensurePuterAuth,
  ensurePuterLoaded,
  getPuterAuthToken,
  getPuterUser,
  isPuterAvailable,
  maskToken,
  puterSignOut,
  terminalTokenCommand,
} from "@/lib/puter";

type Phase = "loading" | "signed-out" | "signed-in";

/**
 * ปุ่มบัญชี Puter ในหัวเวิร์กสเปซ
 * - ล็อกอิน/ออกจากระบบ
 * - คัดลอก token ไปใช้กับ docker-agent ในเทอร์มินัล (ผู้ใช้กดเองทุกครั้ง)
 *
 * ไม่มีที่ไหนบันทึก token: อ่านจาก SDK ตอนผู้ใช้กด แล้วเขียนลงคลิปบอร์ดเท่านั้น
 */
export default function PuterAccountButton({
  onStatus,
  onError,
}: {
  onStatus?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [name, setName] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    const signedIn = !!window.puter?.auth?.isSignedIn?.();
    setPhase(isPuterAvailable() && signedIn ? "signed-in" : "signed-out");
    const user = getPuterUser();
    setName(user?.username || user?.email || "");
    setToken(signedIn ? getPuterAuthToken() : null);
  }, []);

  useEffect(() => {
    let alive = true;
    ensurePuterLoaded()
      .then(() => {
        if (alive) refresh();
      })
      .catch(() => {
        if (alive) setPhase("signed-out");
      });
    return () => {
      alive = false;
    };
  }, [refresh]);

  // ปิดแผงเมื่อคลิกนอกกรอบ
  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  async function signIn() {
    setBusy(true);
    try {
      const loaded = isPuterAvailable() || (await ensurePuterLoaded());
      if (!loaded) throw new Error("โหลด Puter SDK ไม่สำเร็จ ตรวจเน็ตหรือตัวบล็อกสคริปต์");
      const ok = await ensurePuterAuth();
      if (!ok) throw new Error("ยังไม่ได้เข้าสู่ระบบ (อาจปิด popup) — กดอีกครั้งเพื่อเปิดหน้าต่าง Puter");
      refresh();
      onStatus?.("เชื่อมต่อ Puter แล้ว พร้อมสร้างและคัดลอก token ไปใช้ต่อ");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await puterSignOut();
    setToken(null);
    setName("");
    setPhase("signed-out");
    setOpen(false);
    setBusy(false);
    onStatus?.("ออกจากระบบ Puter แล้ว");
  }

  async function copyToken() {
    const current = getPuterAuthToken();
    setToken(current);
    if (!current) {
      onError?.("ไม่พบ token — กดเข้าสู่ระบบ Puter ก่อน");
      return;
    }
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onStatus?.("คัดลอก token แล้ว · วางในคำสั่ง --set-token (อย่าวางในแชตหรือที่สาธารณะ)");
    } catch {
      onError?.("คัดลอกอัตโนมัติไม่ได้ — เลือกข้อความในช่องแล้วคัดลอกเอง");
    }
  }

  if (phase === "loading") {
    return (
      <span className="puter-account loading">
        <Loader2 size={14} className="spin" /> Puter
      </span>
    );
  }

  return (
    <div className="puter-account" ref={box}>
      {phase === "signed-out" ? (
        <button className="subtle" disabled={busy} onClick={() => void signIn()}>
          {busy ? <Loader2 size={14} className="spin" /> : <LogIn size={14} />}
          <span>เข้าสู่ระบบ Puter</span>
        </button>
      ) : (
        <button
          className="subtle"
          aria-expanded={open}
          onClick={() => {
            refresh();
            setOpen(!open);
          }}
        >
          <span className="puter-dot" aria-hidden="true" />
          <span>{name || "บัญชี Puter"}</span>
        </button>
      )}

      {open && phase === "signed-in" && (
        <div className="puter-menu" role="dialog" aria-label="บัญชี Puter">
          <header>
            <strong>{name || "บัญชี Puter"}</strong>
            <small>{token ? `token ${maskToken(token)}` : "ไม่พบ token ในเบราว์เซอร์นี้"}</small>
          </header>

          <button className="menu-item" onClick={() => void copyToken()}>
            {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
            {copied ? "คัดลอกแล้ว" : "คัดลอก token สำหรับเทอร์มินัล"}
          </button>

          <div className="puter-hint">
            <p>
              ใช้กับ docker-agent: วาง token ต่อท้ายคำสั่งนี้ในโฟลเดอร์โปรเจกต์ที่ส่งออก
            </p>
            <code>{terminalTokenCommand()}</code>
            <p className="warn">
              <ShieldAlert size={12} /> token = สิทธิ์ในบัญชีคุณทั้งหมด ห้ามวางในแชต ไฟล์ที่แชร์
              หรือ commit ลง Git
            </p>
          </div>

          <button className="menu-item" disabled={busy} onClick={() => void signOut()}>
            <LogOut size={14} /> ออกจากระบบ Puter
          </button>
        </div>
      )}
    </div>
  );
}

/** ป้ายสถานะสั้น ๆ ให้หน้าอื่นเรียกใช้ (ไม่แสดง token) */
export function PuterTokenHint() {
  return (
    <span className="puter-token-hint">
      <KeyRound size={12} /> ล็อกอิน Puter แล้วกด “คัดลอก token” เพื่อใช้กับเทอร์มินัล
    </span>
  );
}
