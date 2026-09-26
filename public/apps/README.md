# GUPAN Static Apps — ทั้งระบบในที่เดียว

แอปไฟล์ HTML/CSS/JS ล้วน เสิร์ฟรวมกับเว็บหลัก (Next.js) ผ่าน rewrite ใน
`next.config.ts` — ไม่ต้อง deploy แยก

| แอป | โฟลเดอร์ | URL บนเว็บจริง |
|---|---|---|
| Landing (โฮม 3 แกน) | `public/apps/landing/` | `/apps` |
| GUPAN Agent (มี Sandbox รันโค้ด) | `public/apps/agent/` | `/apps/agent` |
| GUPAN Blog | `public/apps/blog/` | `/apps/blog` |
| GUPAN Studio | `src/` (Next.js) | `/` (มีปุ่ม ✳ Apps กลับมาที่นี่) |

## ลิงก์ข้ามแอป

ปุ่ม `data-sys="landing|agent|blog|studio"` + สคริปต์ resolver ในแต่ละ
`index.html` จะเลือก path ให้เอง:

- บนเว็บจริง (`/apps/*`) → ใช้ absolute path `/apps/…`
- เปิดเดี่ยว (static server / ดับเบิลคลิกไฟล์) → ใช้ relative path `../…`

## รันแยกเฉพาะ static (ไม่ต้องใช้ Next.js)

```bash
cd public/apps
python3 -m http.server 8090 --bind 0.0.0.0
# http://localhost:8090/landing/ | /agent/ | /blog/
```
