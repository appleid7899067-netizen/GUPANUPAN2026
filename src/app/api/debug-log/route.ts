/**
 * ปลายทางรับข้อความวินิจฉัยจากเบราว์เซอร์ระหว่างพัฒนา (ดู `lib/dev-report.ts`)
 *
 * - เปิดเฉพาะเมื่อไม่ใช่ production — บนเซิร์ฟเวอร์จริง route นี้จะไม่ทำอะไร
 * - เขียนลง log ของ `next dev` เท่านั้น ไม่เก็บลงดิสก์/ฐานข้อมูล
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 204 });
  }
  try {
    const body = (await request.json()) as {
      scope?: string;
      message?: string;
      detail?: unknown;
    };
    const scope = String(body.scope ?? "client").slice(0, 60);
    const message = String(body.message ?? "").slice(0, 600);
    const detail = body.detail ? JSON.stringify(body.detail).slice(0, 600) : "";
    console.log(`[preview-diag] ${scope}: ${message}${detail ? ` | ${detail}` : ""}`);
  } catch {
    // ข้อความเสียรูปแบบไม่เป็นไร — เครื่องมือวินิจฉัยต้องไม่โยน error
  }
  return new Response(null, { status: 204 });
}
