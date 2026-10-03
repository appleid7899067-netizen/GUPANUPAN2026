#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# run-agent.sh — ล็อกอิน Puter (ถ้ายังไม่มี token) แล้วรัน docker-agent
#                ด้วยโมเดลของ Puter ผ่าน OpenAI-compatible endpoint
#
# ใช้:
#   ./run-agent.sh                          # เปิด TUI
#   ./run-agent.sh "สรุปโปรเจกต์นี้ให้หน่อย"   # ส่งคำสั่งแรกไปเลย
#   FORCE_LOGIN=1 ./run-agent.sh            # บังคับล็อกอินใหม่ก่อนรัน
#   AGENT_FILE=other.yaml ./run-agent.sh    # ใช้ไฟล์ config อื่น
# ---------------------------------------------------------------------------
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

ENV_FILE="${PUTER_ENV_FILE:-.env.puter}"
AGENT_FILE="${AGENT_FILE:-agent.yaml}"
AUTO_LOGIN="${AUTO_LOGIN:-1}"

read_env_value() { # $1 = key, $2 = file
  local key="$1" file="$2" line
  [[ -f "$file" ]] || return 1
  line="$(grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 1
  line="${line#*=}"
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  printf '%s' "$line"
}

# 1) หาคำสั่ง docker-agent (binary ตรง ๆ หรือ plugin ใต้ docker)
if command -v docker-agent >/dev/null 2>&1; then
  AGENT_CMD=(docker-agent)
elif command -v docker >/dev/null 2>&1 && docker agent version >/dev/null 2>&1; then
  AGENT_CMD=(docker agent)
else
  cat >&2 <<'EOS'
✘ ไม่พบคำสั่ง docker-agent

ติดตั้งอย่างใดอย่างหนึ่ง:
  • Docker Desktop 4.63+  → มีปลั๊กอินมาให้แล้ว ใช้ `docker agent`
  • Homebrew              → brew install docker-agent
  • ดาวน์โหลด binary      → https://github.com/docker/docker-agent/releases
EOS
  exit 1
fi

# 2) ต้องมีไฟล์ config
if [[ ! -f "$AGENT_FILE" ]]; then
  echo "✘ ไม่พบไฟล์ config: $AGENT_FILE" >&2
  exit 1
fi

# 3) จัดการ token (ลำดับ: env → ไฟล์ → ล็อกอินใหม่)
token="${PUTER_AUTH_TOKEN:-}"
if [[ -z "$token" ]]; then
  token="$(read_env_value PUTER_AUTH_TOKEN "$ENV_FILE" || true)"
fi

if [[ "${FORCE_LOGIN:-0}" == "1" ]]; then
  token=""
fi

if [[ -z "$token" ]]; then
  if [[ "$AUTO_LOGIN" != "1" ]]; then
    echo "✘ ยังไม่มี PUTER_AUTH_TOKEN และ AUTO_LOGIN=0" >&2
    echo "  รัน: node puter-login.mjs" >&2
    exit 1
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "✘ ต้องมี Node.js 20+ เพื่อล็อกอิน (หรือใช้ --set-token ด้วย token จาก puter.com/dashboard)" >&2
    exit 1
  fi
  echo "• ยังไม่มี token ของ Puter — กำลังเปิดขั้นตอนล็อกอิน"
  node puter-login.mjs
  token="$(read_env_value PUTER_AUTH_TOKEN "$ENV_FILE" || true)"
  [[ -n "$token" ]] || { echo "✘ ล็อกอินไม่สำเร็จ" >&2; exit 1; }
fi

# 4) ประกอบคำสั่ง (แนบ --env-from-file เฉพาะเมื่อไฟล์มีจริง)
args=(run)
if [[ -f "$ENV_FILE" ]]; then
  args+=(--env-from-file "$ENV_FILE")
else
  export PUTER_AUTH_TOKEN="$token"
fi
args+=("$AGENT_FILE")

echo "• รัน: ${AGENT_CMD[*]} ${args[*]} ${*:-}"
exec "${AGENT_CMD[@]}" "${args[@]}" "$@"
