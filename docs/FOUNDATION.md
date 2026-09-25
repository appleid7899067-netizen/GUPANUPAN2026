# Panupan • BOSSNU foundation (GUPANUPAN2026)

## Real (not placeholder)

| Layer | Implementation |
|-------|----------------|
| Brand | `src/lib/brand.ts` → **Panupan • BOSSNU** |
| Login | Puter.js `auth.signIn` via `src/lib/puter.ts` |
| Models | Free list in `FREE_MODELS` — Puter `ai.chat` first |
| Generate | Client tries Puter free models; falls back to `/api/generate` |

## Closed gaps

1. No longer marketed as "Forge" / generic Grok template in UI (deprecated aliases kept only for compatibility).
2. Model success requires actual Puter or API response text.
3. Sign-in is Puter (user-owned), not a fake always-on session.
4. Free models only in the default path unless user picks another.

## Usage

```ts
import { puterSignIn, puterFreeChat } from "@/lib/puter";
await puterSignIn();
const { ok, text } = await puterFreeChat([{ role: "user", content: "Hello" }]);
```

## Production build

- `npm install` + `npm run build` succeeds (Vite + Nitro + Vercel preset).
- Preview: `npx vite preview --host 0.0.0.0 --port 8080`
- Deploy-ready artifact: `.vercel/output/`
