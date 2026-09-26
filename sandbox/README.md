# Sandbox — Isolated per-project environments (Puter Hybrid)

> **มันม่มีแซนบ็อกหามาดิ** — เติมแล้ว ✅

Hybrid sandbox ของ GUPANUPAN2026 แยกต่อโปรเจค (isolated) เหมือน Totalum แต่รันบน **Puter**

```
sandbox/
├── preview/   → hosting per project (puter.hosting.create → *.puter.site)
├── storage/   → fs per project (puter.fs at /<user>/AppData/<appID>/<projectId>)
└── logs/      → build / runtime logs (local + puter)
```

## สถานะ sandbox (เหมือน Totalum)

| Status | หมายความว่า | ทำอะไร |
|---|---|---|
| `Active` | sandbox รันอยู่, preview พร้อม | เขียนไฟล์ / rebuild / publish ได้ |
| `Unarchiving` | กำลังปลุก (Puter: ~1.5s, Totalum: 2-4นาที) | รอ `wakeSandbox()` |
| `Archived` | หลับหลัง idle 1ชม. | ต้อง wake ก่อนทำอะไร |

## ใช้ยังไง

- **Dashboard** → sandbox list (component `PuterSandboxList`)
- **Workspace** → tab **Sandbox** (component `PuterSandboxPanel`)
- **Code** → `import { getSandbox, wakeSandbox } from "@/lib/puter-sandbox"`

## Puter vs Totalum

- **Puter mode** (ไม่มี TOTALUM key): `puter-sandbox.ts` จัดการเอง — `puter.kv` เก็บ metadata, `puter.fs` แยกโฟลเดอร์, `puter.hosting` แยก subdomain
- **Totalum mode** (มี key): ใช้ `agentServerStatus` จาก `GET /projects/:id` เหมือนเดิม — ไม่ต้องแตะ sandbox นี้
- ทั้งสองแสดงใน UI เดียวกัน (tab Sandbox แสดงสถานะจริงตาม mode)

## Server wake

`sandbox` หลับ → ทุก write/rebuild/publish จะได้ `409 SERVER_NOT_READY` → `useServerWake` จะ poll จน `Active` แล้ว retry อัตโนมัติ (Puter เร็วกว่าเพราะ wake แค่ 1.5s)
