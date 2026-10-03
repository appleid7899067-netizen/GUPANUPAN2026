"use client";

import React from "react";

/**
 * ═══ markdown เบาสำหรับข้อความผู้ช่วยในแชท ═══════════════════════════════
 *
 * คำตอบสรุปของ AI (extractSummary) ใช้รูปแบบเดียวกับแชทของ Bolt:
 * bullet ขึ้นต้นด้วย "- " และคำสำคัญหุ้ม **ตัวหนา** — ไม่มีความจำเป็นต้อง
 * ลง markdown parser เต็มรูปแบบ และที่นี่สร้างเป็น React elements ล้วน
 * (ไม่ใช้ dangerouslySetInnerHTML) จึงไม่มีช่อง XSS จากข้อความ AI
 */

/** แตก **ตัวหนา** ในหนึ่งบรรทัดเป็น <strong> โดยข้อความอื่นปล่อยผ่านตรง ๆ */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={`${keyPrefix}-b${i}`}>{part}</strong> : part,
  );
}

export default function MarkdownLite({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = (key: string) => {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={key}>
        {items.map((item, i) => (
          <li key={i}>{inline(item, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
  };
  (text || "").split("\n").forEach((raw, i) => {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList(`ul${i}`);
    if (!line) return;
    blocks.push(<p key={`p${i}`}>{inline(line, `p${i}`)}</p>);
  });
  flushList("ul-end");
  return <div className="md-lite">{blocks}</div>;
}
