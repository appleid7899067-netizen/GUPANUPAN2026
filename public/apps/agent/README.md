# GUPAN Agent — หน้าแชทสไตล์ Agent Mode (HTML/CSS/JS ล้วน)

เลย์เอาต์สไตล์เดียวกับหน้า Agent ของเว็บ AI ชั้นนำ: แถบไอคอนซ้าย แถบบนเลือกโหมด
หัวข้อกลางจอ serif ช่องพิมพ์การ์ดใหญ่ — แต่ใช้แบรนด์และภาษาไทยของ GUPAN เอง

```
public/apps/agent/
├── index.html   # โครง: rail + topbar + hero/thread + composer + drawer
├── styles.css   # ธีมครีมมินิมอล ไม่มีเฟรมเวิร์ก
└── app.js       # แชท + ประวัติ + โหมด + Puter AI (มีโหมดเดโมถ้ายังไม่ล็อกอิน)
```

## เปิดใช้

```bash
cd public/apps/agent
python3 -m http.server 8081 --bind 0.0.0.0
# เปิด http://localhost:8081
```

หรือดับเบิลคลิก `index.html` ได้เลย (โหมดเดโมใช้ได้ทันที)

## ฟีเจอร์

- ✳ 3 โหมด: GUPAN Agent / ถาม–ตอบ / วางแผน
- 💬 แชท + ประวัติ 50 ห้อง + ค้นหา (localStorage)
- 📎 แนบไฟล์ (ชื่อไฟล์แนบไปกับคำสั่ง)
- ⚙ เลือกโมเดล Puter ได้
- 🚀 ล็อกอิน Puter แล้วใช้ AI จริงผ่าน `puter.ai.chat` แบบสตรีม
- ⛶ **Sandbox พร้อมรัน**: โค้ดที่บอทเขียนมีปุ่ม ▶ รันโค้ดนี้ — รันใน iframe
  แยกปลอดภัย (`sandbox="allow-scripts"`) มี Preview/Code/Console จำโค้ดล่าสุดไว้ให้
- 📱 มือถือซ่อน rail ให้พื้นที่เต็มจอ (Sandbox กลายเป็นจอเต็ม)
