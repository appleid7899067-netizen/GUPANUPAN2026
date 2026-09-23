# GuPanu foundation (GUPANUPAN2026)

## Real (not placeholder)

| Layer | Implementation |
|-------|----------------|
| Brand | `src/lib/brand.ts` → **GuPanu** |
| Login | Puter.js `auth.signIn` via `src/lib/puter.ts` + `puter-auth.tsx` |
| Models | Free list in `FREE_MODELS` — Puter `ai.chat` first |
| Generate | Client tries Puter free models; falls back to `/api/generate` |

## Close these gaps

1. Do not market as "Forge" / generic Grok template in UI.
2. Do not claim model success without Puter or API response text.
3. Sign-in is Puter (user-owned), not a fake always-on session.
4. Free models only in the default path unless user picks another.

## Usage

```ts
import { puterSignIn, puterFreeChat } from "@/lib/puter";
await puterSignIn();
const { ok, text } = await puterFreeChat([{ role: "user", content: "Hello" }]);
```
