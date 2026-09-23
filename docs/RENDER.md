# Render setup — GuPanu

## Quick deploy

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect repo `appleid7899067-netizen/GUPANUPAN2026`
3. Render reads `render.yaml` → service name **gupanu**
4. Deploy

## Manual Web Service

| Field | Value |
|-------|--------|
| Runtime | Node |
| Build | `npm install && npm run build` |
| Start | `npm start` |
| Health check | `/` |
| Node | 22 |

## Env (optional)

| Key | Notes |
|-----|--------|
| `DATABASE_URL` | Neon Postgres; omit → PGLite |
| `VITE_AUTH_ENABLED` | set `true` for real gate auth |

## Puter

Login + free models run **in the browser** (Puter.js). No Puter secret required on Render.

## After deploy

Open the `*.onrender.com` URL → **ล็อกอิน Puter** → build with free models.
