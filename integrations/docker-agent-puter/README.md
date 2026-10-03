# docker-agent × Puter — ใช้บัญชี Puter เป็นโมเดล (ไม่ต้องมี API key)

โฟลเดอร์นี้ทำให้ [`docker-agent`](https://github.com/docker/docker-agent) เรียกโมเดลผ่าน **บัญชี Puter**
แทนการซื้อ API key ของ OpenAI / Anthropic / Google / xAI โดยใช้ข้อเท็จจริงว่า Puter เปิด
**endpoint ที่เข้ากันได้กับ OpenAI** ไว้ที่:

```
https://api.puter.com/puterai/openai/v1/
Authorization: Bearer <PUTER_AUTH_TOKEN>
```

docker-agent รับ token ผ่านตัวแปรสภาพแวดล้อม (`token_key`) อยู่แล้ว จึงต่อกันได้ตรง ๆ —
สคริปต์ในโฟลเดอร์นี้ช่วย **ล็อกอิน Puter** แล้วเก็บ token ให้เอง

```
   ┌──────────────┐   ล็อกอิน (popup)   ┌───────────────┐
   │  เบราว์เซอร์  │ ─────────────────▶ │  puter.com    │
   └──────┬───────┘                    └───────┬───────┘
          │ token (localhost callback)         │
          ▼                                    │
   ┌──────────────────┐                        │
   │  .env.puter      │  PUTER_AUTH_TOKEN=…    │
   └──────┬───────────┘                        │
          │ --env-from-file                    │
          ▼                                    ▼
   ┌──────────────────┐  Bearer token  ┌─────────────────────────────────┐
   │  docker-agent    │ ─────────────▶ │ api.puter.com/puterai/openai/v1 │
   │  (TUI / CLI)     │ ◀───────────── │ GPT · Claude · Gemini · Grok ·  │
   └──────────────────┘   streaming    │ DeepSeek · Qwen · GLM · Kimi …  │
                                      └─────────────────────────────────┘
```

---

## 1) สิ่งที่ต้องมี

| สิ่งที่ต้องมี | เวอร์ชัน / หมายเหตุ |
| --- | --- |
| docker-agent | มาจาก Docker Desktop 4.63+ (`docker agent`), Homebrew (`brew install docker-agent`), หรือ binary จาก [Releases](https://github.com/docker/docker-agent/releases) |
| Node.js | 20 ขึ้นไป (ใช้เฉพาะขั้นตอนล็อกอิน/ดึง token) |
| บัญชี Puter | สมัครฟรีที่ <https://puter.com> |

> ถ้าไม่มี Docker Desktop / docker-agent บนเครื่องนั้น ยังใช้ `puter-login.mjs` ดึง token ไปตั้งให้เครื่องอื่นได้

## 2) เริ่มใช้ใน 3 คำสั่ง

```bash
cd integrations/docker-agent-puter
npm install          # ติดตั้ง @heyputer/puter.js (ใช้ทำล็อกอิน + ตรวจ token)
npm run login        # เปิดเบราว์เซอร์ → ล็อกอิน Puter → เขียนไฟล์ .env.puter
./run-agent.sh "สวัสดี แนะนำตัวหน่อย"
```

`run-agent.sh` จะตรวจว่ามี token หรือยัง ถ้าไม่มีจะเรียกขั้นตอนล็อกอินให้อัตโนมัติ
แล้วจึงรัน:

```bash
docker-agent run --env-from-file .env.puter agent.yaml
```

## 3) สองวิธีได้ token

### วิธี A — ล็อกอินผ่านเบราว์เซอร์ (ค่าเริ่มต้น, แนะนำ)

```bash
npm run login              # ล็อกอิน; ถ้ามี token เดิมที่ยังใช้ได้ จะใช้ต่อ ไม่ล็อกอินซ้ำ
npm run login:force        # ล็อกอินบัญชีใหม่ทับของเดิม
npm run verify             # ตรวจ token ปัจจุบัน + แสดงบัญชี/โควตา
npm run verify:ping        # ตรวจ + ยิงแชตทดสอบจริง 1 ครั้งที่ endpoint
```

- เบราว์เซอร์จะเปิดไปที่ `puter.com` ให้ล็อกอิน/กดอนุญาต แล้วส่ง token กลับมาที่ `http://localhost:<สุ่มพอร์ต>`
- สคริปต์ **พิมพ์ URL ล็อกอินออกจอเสมอ** — ถ้าอยู่บนเครื่องรีโมต/ไม่มีจอ (SSH, container, WSL ที่เปิดเบราว์เซอร์ไม่ได้)
  ให้ก๊อป URL นั้นไปเปิดในเบราว์เซอร์ของเครื่องตัวเอง แล้วรอจนขึ้นหน้า “ล็อกอินสำเร็จ”
- callback รับ token ผ่าน `http://127.0.0.1` เท่านั้น (ไม่เปิดรับจากเครือข่าย)
- token ถูกเขียนลง `.env.puter` สิทธิ์ `600` และสคริปต์จะไม่พิมพ์ token เต็ม (ปิดบังไว้ ยกเว้นใช้ `--print`)
- ถ้าอยากใช้วิธีล็อกอินของ SDK เอง (เหมือน tutorial ของ Puter) ใช้ `npm run login -- --sdk-login`

**ทดสอบสคริปต์เองโดยไม่ต้องมีบัญชีจริง** — มีชุดทดสอบย่อยที่จำลองหน้าเว็บ Puter ไว้:

```bash
npm test        # 4 เทสต์: ล็อกอินผ่าน callback, --help, --verify, การส่ง argument ให้ docker-agent
```

### วิธี B — สร้าง token เองจาก dashboard (ใช้ได้บนเซิร์ฟเวอร์/CI)

1. เข้า <https://puter.com/dashboard> → กด **Create token** / **Copy** auth token
2. บันทึกด้วยสคริปต์ หรือวางมือก็ได้

```bash
npm run set-token -- PASTE_TOKEN_HERE
# หรือ
printf 'PUTER_AUTH_TOKEN=%s\n' 'PASTE_TOKEN_HERE' > .env.puter && chmod 600 .env.puter
```

### ใช้ token ร่วมกับทุกโปรเจกต์ (ไม่ต้องมี `.env.puter` ทุกโฟลเดอร์)

docker-agent โหลดไฟล์ env ส่วนกลางที่ `~/.config/cagent/.env` ให้เองโดยอัตโนมัติ
(เป็นไฟล์เดียวกับที่ `docker agent setup` ใช้) — วางบรรทัดนี้ไว้ในนั้นครั้งเดียว แล้วรันได้ทุกที่:

```bash
mkdir -p ~/.config/cagent && chmod 700 ~/.config/cagent
printf 'PUTER_AUTH_TOKEN=%s\n' "$(sed -n 's/^PUTER_AUTH_TOKEN=//p' .env.puter)" >> ~/.config/cagent/.env
chmod 600 ~/.config/cagent/.env
```

> **หมายเหตุ:** ลำดับความสำคัญของ docker-agent คือ OS env → run secrets → `~/.config/cagent/.env` → credential helper → Docker Desktop
> ค่าที่ตั้งใน environment ของ shell จะชนะไฟล์เสมอ

## 4) ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | หน้าที่ |
| --- | --- |
| `agent.yaml` | config ของ docker-agent: ประกาศ `providers: puter` + โมเดล + ทีม agent (root / coder / researcher) |
| `puter-login.mjs` | ล็อกอิน Puter ผ่านเบราว์เซอร์ → เก็บ/ตรวจ token (`--print`, `--verify`, `--ping`, `--set-token`) |
| `run-agent.sh` | ตัวช่วยรัน: หา `docker-agent` → จัดการ token → `run --env-from-file .env.puter agent.yaml` |
| `tests/login-flow.test.mjs` | ชุดทดสอบ (จำลอง Puter + docker-agent ปลอม) — รันด้วย `npm test` |
| `package.json` | ประกาศ dependency `@heyputer/puter.js` และคำสั่ง npm |
| `.env.puter` | **ไฟล์ที่สร้างขึ้น** เก็บ token (ถูก gitignore แล้ว) |

## 5) ส่วนสำคัญของ `agent.yaml` และเหตุผล

```yaml
providers:
  puter:
    provider: openai                     # ใช้ไคลเอนต์ตระกูล OpenAI
    api_type: openai_chatcompletions     # ⚠️ ต้องระบุ (ดูข้อ 3 ด้านล่าง)
    base_url: https://api.puter.com/puterai/openai/v1/
    token_key: PUTER_AUTH_TOKEN          # ชื่อตัวแปร ไม่ใช่ตัว token

models:
  puter-fast:
    provider: puter
    model: gpt-5.4-nano
    max_tokens: 8192
    provider_opts:
      context_size: 128000
```

จากนั้น agent ไหนจะใช้โมเดลไหนก็แค่อ้างชื่อ:

```yaml
agents:
  root:
    model: puter-fast
    sub_agents: [coder, researcher]
  coder:
    model: puter-code
```

และใช้รูปแบบย่อ ` provider/model ` ได้ด้วย:

```bash
docker-agent run --env-from-file .env.puter --model root=puter/claude-sonnet-5 agent.yaml
```

### 3 จุดที่พลาดบ่อย

1. **ต้องมี `api_type: openai_chatcompletions`** — ถ้าไม่ระบุ docker-agent จะเดาชนิด API จากชื่อโมเดล
   (เช่น `gpt-5.x`, `gpt-4.1`, o-series → `openai_responses`) ซึ่ง Puter ไม่รองรับ → ได้ 400/404
   ในทางกลับกัน docker-agent จะไม่ส่งคำขอผ่าน models gateway เมื่อตั้ง `base_url` เองอยู่แล้ว
2. **`token_key` เป็นชื่อตัวแปรสภาพแวดล้อม** (เช่น `PUTER_AUTH_TOKEN`) ไม่ใช่ตัว token — ตัว token เก็บใน `.env.puter`
3. **ต้องส่งไฟล์ token เข้าไปด้วย** `--env-from-file .env.puter` ทุกครั้งถ้ารันมือ (สคริปต์ `run-agent.sh` ทำให้แล้ว)

## 6) เลือกโมเดล

โมเดลใน Puter มีชื่อตามเจ้าของ เช่น `claude-sonnet-5`, `gemini-3.1-flash-lite`, `grok-4-1-fast`,
หรือแบบมี prefix ได้แก่ `openai/...`, `deepseek/...`, `qwen/...`, `z-ai/...`, `moonshotai/...`

| ใน `agent.yaml` | โมเดล Puter | เหมาะกับ |
| --- | --- | --- |
| `puter-fast` | `gpt-5.4-nano` | งานทั่วไป เร็ว ค่าใช้จ่ายต่ำ |
| `puter-smart` | `claude-sonnet-5` | วิเคราะห์/วางแผนซับซ้อน |
| `puter-gemini` | `gemini-3.1-flash-lite` | บริบทใหญ่ อ่านไฟล์ยาว |
| `puter-code` | `openai/gpt-5.3-codex` | เขียน/แก้โค้ด |
| `puter-oss` | `openai/gpt-oss-120b` | โมเดล open weights |

สลับโมเดลชั่วคราวโดยไม่แก้ไฟล์:

```bash
./run-agent.sh --model root=puter/claude-sonnet-5   # provider puter + ชื่อโมเดลของ Puter
./run-agent.sh --model root=puter/grok-4-1-fast     # สลับไป Grok
./run-agent.sh --model coder=puter/gemini-3.1-flash-lite
```

(รูปแบบคือ `provider/model` โดย `puter` คือชื่อใน `providers:` ที่เราประกาศไว้ — ใช้ได้กับทุกคำสั่งย่อย
ไม่ต้องแก้ `agent.yaml` เลย)

> รายชื่อโมเดลทั้งหมดดูได้ที่ Puter: <https://developer.puter.com/ai/> — ถ้าบัญชีไม่มีสิทธิ์ใช้โมเดลนั้น
> จะได้ error `model_not_found` / `permission denied` ให้เปลี่ยนโมเดลหรือเติมเครดิต

## 7) ข้อจำกัดที่ควรรู้ก่อนใช้จริง

- **โมเดล "user-pays"**: ผู้ใช้ (บัญชี Puter ของคุณ) เป็นคนจ่ายตามการใช้งาน ไม่ใช่เรา —
  โควตาฟรีมีจำกัด และโมเดลระดับพรีเมียมอาจต้องมีเครดิต ตรวจได้ด้วย `npm run verify`
  (`getMonthlyUsage`) และที่ <https://puter.com/dashboard>
- **Tool calling ไม่เท่ากันทุกโมเดล**: docker-agent ทำงานด้วย tools (think/todo/filesystem/transfer_task)
  โมเดลที่รองรับ function calling จะทำงานได้เต็มที่ ส่วนโมเดลที่ไม่รองรับจะตอบได้แต่ไม่เรียกเครื่องมือ
  ถ้าเห็น agent "พูดอย่างเดียวไม่ลงมือ" ให้เปลี่ยนไปใช้ตระกูล GPT/Claude/Gemini
- **พารามิเตอร์เฉพาะรุ่น**: endpoint ของ Puter อาจไม่รองรับ parameter พิเศษบางตัว
  (`reasoning_effort`, ตัวเลือกเฉพาะ Codex ฯลฯ) ให้ลด config ให้เรียบง่ายถ้าเจอ 400
- **ค่าใช้จ่ายยังเกิดขึ้นแม้กดหยุด**: ปุ่มหยุดของ TUI/CLI หยุดการรับผลเท่านั้น ไม่ได้ยกเลิกคำขอที่ส่งไปแล้ว
- **ทดสอบในแซนด์บ็อกซ์ที่เขียนโค้ดนี้ไม่ได้แบบ end-to-end**: สภาพแวดล้อมนั้นบล็อกการเชื่อมต่อ
  `api.puter.com` จึงยืนยันได้เฉพาะไวยากรณ์, schema ของ docker-agent, ขั้นตอนล็อกอิน (จำลอง),
  และการส่ง argument — การยิงจริงให้ทดสอบบนเครื่องของคุณด้วย `npm run verify:ping`

## 8) แก้ปัญหา

| อาการ | สาเหตุที่พบบ่อย | วิธีแก้ |
| --- | --- | --- |
| `401 Unauthorized` | token หมดอายุ/ถูกลบ หรือล็อกอินผิดบัญชี | `npm run login:force` หรือสร้าง token ใหม่จาก dashboard |
| `404 model_not_found` | ชื่อโมเดลไม่ตรงกับที่ Puter เปิดให้ใช้ | เช็คชื่อจาก <https://developer.puter.com/ai/> แล้วแก้ใน `agent.yaml` |
| `400` + ข้อความเกี่ยวกับ `/responses` | ลืมตั้ง `api_type: openai_chatcompletions` | เติมคีย์นี้ใน `providers.puter` |
| agent ไม่เรียก tools | โมเดลนั้นไม่รองรับ function calling | เปลี่ยนเป็น `gpt-5.4-nano`, `claude-sonnet-5`, `gemini-3.1-flash-lite` |
| `429` / ใช้เกินโควตา | ชนเพดานของบัญชี Puter | รอรอบถัดไป ใช้โมเดลถูกลง หรือเติมเครดิต |
| `✘ ไม่พบคำสั่ง docker-agent` | ยังไม่ได้ติดตั้ง | ติดตั้งตามตารางข้อ 1 แล้วลองใหม่ |
| ตรวจ token ไม่ผ่านเพราะ "เชื่อมต่อไม่ได้" | เน็ต/ไฟร์วอลล์บล็อก `api.puter.com` | ตรวจการเชื่อมต่อหรือ VPN/พร็อกซีขององค์กร |
| `EACCES` ตอนรัน `run-agent.sh` | ไฟล์ยังไม่ executable | `chmod +x run-agent.sh` |
| หน้าเว็บขึ้น "ล็อกอินสำเร็จ" แต่ terminal ยังรอ | เบราว์เซอร์เปิด `localhost` คนละเครื่อง/stack กับที่รันสคริปต์ | กด Ctrl+C แล้วใช้ `npm run login -- --sdk-login` หรือวิธี B |

## 9) ความปลอดภัย

- token ของ Puter = สิทธิ์เข้าถึงบัญชีคุณ (AI, ไฟล์บน Puter Drive, ฯลฯ) **ห้ามแชร์ ห้าม commit**
  โฟลเดอร์นี้มี `.gitignore` กัน `.env.puter` และ `node_modules/` ไว้แล้ว
- สคริปต์เขียนไฟล์ด้วยสิทธิ์ `600` และปิดบัง token เวลาพิมพ์ออกจอ (แสดงเฉพาะ 6 ตัวแรก/4 ตัวท้าย)
- `--print` จะพิมพ์ token เต็ม — ระวังประวัติคำสั่งใน shell
- ถ้า token หลุด: ลบบัญชี token นั้นที่ <https://puter.com/dashboard> แล้วล็อกอินใหม่

## 10) ตรวจสอบแล้วแค่ไหน (ความโปร่งใส)

| สิ่งที่ตรวจ | ผล |
| --- | --- |
| `agent.yaml` เทียบ schema ทางการของ docker-agent v16 (`agent-schema.json`) | ✅ ผ่าน (Ajv, draft-07) |
| ขั้นตอนล็อกอินแบบ localhost callback (จำลองหน้าเว็บ Puter ในเครื่อง) | ✅ `npm test` ผ่าน — ได้ token กลับมาและพิมพ์ออกถูกต้อง |
| `run-agent.sh` ส่ง argument/ไฟล์ env ให้ docker-agent | ✅ ทดสอบด้วย docker-agent ปลอมใน `npm test` |
| การโหลด `@heyputer/puter.js` (`init`, `getAuthToken`) และการจัดการ error รูปแบบ XHR ของ SDK | ✅ ทดสอบในเครื่อง |
| ยิงคำขอจริงไปที่ `api.puter.com` | ❌ ยังไม่ได้ — สภาพแวดล้อมที่เขียนโค้ดนี้บล็อกโดเมนนั้น ให้คุณยืนยันด้วย `npm run verify:ping` |

## 11) อ้างอิง

- Puter — OpenAI-compatible endpoint: <https://developer.puter.com/tutorials/use-openai-sdk-with-puter/>
- Puter — Node.js + การล็อกอินด้วย `getAuthToken()`: <https://developer.puter.com/tutorials/puter-js-node-js/>
- Puter — เอกสาร Auth: <https://docs.puter.com/Auth/>
- docker-agent — provider แบบกำหนดเอง (`providers:`, `api_type`, `token_key`): [`docs/providers/custom`](https://github.com/docker/docker-agent/blob/main/docs/providers/custom/index.md)
- docker-agent — ตัวเลือกบรรทัดคำสั่ง: `docker-agent run --help`
