import Link from "next/link";
export const metadata = { title: "ขอบเขตการใช้งาน — GUPAN Studio" };
export default function CapabilitiesPage() {
  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <Link href="/">← กลับหน้าหลัก</Link>
      <h1 className="text-3xl font-bold">
        คล้าย Bolt ในรูปแบบการทำงาน ไม่ใช่ฟีเจอร์เท่ากันทั้งหมด
      </h1>
      <p>
        GUPAN Studio ใช้รูปแบบสั่ง AI → ดูโค้ด → พรีวิว → แก้ต่อ โดยแยก backend
        สองแบบ
      </p>
      <section className="border rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold">Puter frontend workspace</h2>
        <p>
          สร้างเว็บ HTML/CSS/JavaScript ไฟล์เดียว พรีวิวใน iframe ที่แยกสิทธิ์
          แก้โค้ดเอง บันทึกในเบราว์เซอร์ เก็บประวัติ 8 ครั้ง และส่งออก ZIP
        </p>
        <p>
          ไม่มี Node.js runtime, npm, ฐานข้อมูลจริง หรือ cloud sync โค้ด AI
          ต้องตรวจสอบก่อนนำไปเผยแพร่ การใช้ AI ขึ้นกับบัญชี โควตา และค่าบริการ
          Puter
        </p>
      </section>
      <section className="border rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold">Totalum workspace เดิม</h2>
        <p>
          ตั้งค่า TOTALUM_VCAAS_API_KEY บนเซิร์ฟเวอร์เพื่อใช้เส้นทาง full-stack
          ของ Totalum ความพร้อมใช้งานและค่าใช้จ่ายขึ้นกับบริการภายนอก ต้องเพิ่ม
          authentication และ ownership checks ก่อนเปิดให้สาธารณะใช้
        </p>
      </section>
      <p className="text-sm text-gray-500">
        ยังไม่มีผล benchmark ที่ยืนยันว่าเร็วกว่า Bolt และไม่รับรองการใช้ AI
        ฟรีไม่จำกัด
      </p>
    </main>
  );
}
