# GUPAN Landing — หน้าโฮม 3 แกน (HTML/CSS/JS ล้วน)

หน้าโฮมโทนครีมเดียวกับ Agent แบ่งเป็น 3 แกน:

- **แกนนำ** — แถบบน + ฮีโร่ + ปุ่มเข้าแอป
- **แกนกลาง** — การ์ด 3 ใบ: Agent / Blog / ไฟล์ล้วน
- **แกนหลัง** — แถบสถิติตัวเลขนับขึ้น + ฟุตเทอร์

```
apps/landing/
├── index.html
├── styles.css
└── app.js   # preloader 1..99 + count-up
```

## เปิดใช้ (ให้เห็นลิงก์ไป Agent/Blog ด้วย)

เสิร์ฟทั้งโฟลเดอร์ `apps/` จากจุดเดียว:

```bash
cd apps
python3 -m http.server 8090 --bind 0.0.0.0
# โฮม:    http://localhost:8090/landing/
# Agent:  http://localhost:8090/agent/
# Blog:   http://localhost:8090/blog/
```
