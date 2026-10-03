"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ═══ พิมพ์ด้วยเสียง (ปุ่มไมค์แบบ bolt.new) ════════════════════════════════
 *
 * ใช้ Web Speech API จริง — ไม่มีปุ่มปลอม: เบราว์เซอร์ที่ไม่มี
 * `SpeechRecognition` จะไม่เห็นปุ่มไมค์เลย (hook รายงาน `supported=false`)
 * และปุ่มไม่ยิงคำขอใด ๆ จนกว่าผู้ใช้จะกดเอง
 *
 * TypeScript ยังไม่มีชนิดของ SpeechRecognition ใน lib.dom จึงประกาศโครง
 * เท่าที่ใช้ไว้ที่นี่แบบแคบที่สุด (start/stop/onresult/onend/onerror)
 */
interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  isFinal: boolean;
  [index: number]: SpeechAlternative | boolean;
}
interface SpeechResultList {
  readonly length: number;
  [index: number]: SpeechResult;
}
interface SpeechEvent {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * @param onText เรียกด้วยข้อความถอดเสียงสุดท้ายแต่ละประโยค
 *   (ผู้เรียกนำไปต่อท้ายช่องพิมพ์เอง)
 * @returns `supported` มี API ให้ใช้ไหม, `listening` กำลังฟังอยู่ไหม,
 *   `toggle` กดเพื่อเริ่ม/หยุดฟัง
 */
export function useSpeechInput(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const sink = useRef(onText);

  useEffect(() => {
    sink.current = onText;
  }, [onText]);

  useEffect(() => {
    setSupported(getSpeechCtor() !== null);
  }, []);

  // ออกจากหน้าแล้วต้องหยุดฟัง — ไมค์ไม่ควรค้างอยู่นอกบิลเดอร์
  useEffect(
    () => () => {
      recognition.current?.abort();
      recognition.current = null;
    },
    [],
  );

  const toggle = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    if (recognition.current) {
      recognition.current.stop();
      recognition.current = null;
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "th-TH";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const alt = result[0];
        const text = typeof alt === "object" ? alt.transcript.trim() : "";
        if (text) sink.current(text);
      }
    };
    const finish = () => {
      recognition.current = null;
      setListening(false);
    };
    rec.onend = finish;
    rec.onerror = finish;
    recognition.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      finish();
    }
  }, []);

  return { supported, listening, toggle };
}
