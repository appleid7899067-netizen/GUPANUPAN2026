/**
 * ═══ ช่องทางวินิจฉัยสำหรับนักพัฒนา (เฉพาะโหมด dev) ═══════════════════════════
 *
 * พรีวิวรันในเบราว์เซอร์ของผู้ใช้ — เวลามีปัญหา (จอขาว/คอมไพล์ไม่ผ่าน) เรามองไม่เห็น
 * console ของเขา ไฟล์นี้ส่งข้อความสั้น ๆ ไปที่ `POST /api/debug-log` เพื่อให้ log
 * ปรากฏบนเซิร์ฟเวอร์ที่รัน `next dev` (route ปิดตัวเองเมื่อเป็น production)
 *
 * ต้องไม่มีผลข้างเคียง: ผิดพลาดแล้วเงียบ ห้ามทำให้ UI พัง และไม่ส่งข้อมูลโปรเจกต์
 * (ตัดข้อความให้สั้น) — ใช้เฉพาะกับข้อความวินิจฉัยเท่านั้น
 */

const MAX = 600;

/** ส่งข้อความวินิจฉัยไปที่ log ของเซิร์ฟเวอร์ (dev เท่านั้น) */
export function reportToServer(
  scope: string,
  message: string,
  detail?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/debug-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        scope: String(scope).slice(0, 60),
        message: String(message).slice(0, MAX),
        detail: detail ? JSON.parse(JSON.stringify(detail).slice(0, MAX)) : undefined,
      }),
    }).catch(() => {});
  } catch {
    // เงียบไว้ — เครื่องมือวินิจฉัยต้องไม่ทำให้หน้าพัง
  }
}
