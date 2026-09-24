import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export function GuPanuMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      role="img"
      aria-label="BOSSNU"
    >
      <defs>
        <linearGradient id="bossnu-mark" x1="5" y1="4" x2="27" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" className="[stop-color:#a78bfa]" />
          <stop offset="0.55" className="[stop-color:#8b5cf6]" />
          <stop offset="1" className="[stop-color:#d946ef]" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" className="fill-zinc-950" />
      <path
        d="M8 8.5h8.1c3.5 0 5.7 1.7 5.7 4.3 0 1.7-.9 3-2.5 3.7 2.1.6 3.3 2 3.3 4.2 0 3.1-2.6 4.9-6.4 4.9H8V8.5Zm4.1 3.5v2.9h3.7c1.2 0 1.9-.5 1.9-1.5 0-.9-.7-1.4-1.9-1.4h-3.7Zm0 6.2v3.8h4c1.5 0 2.4-.6 2.4-1.9 0-1.2-.9-1.9-2.4-1.9h-4Z"
        fill="url(#bossnu-mark)"
      />
      <path
        d="M24.5 7.5c1.7 2.2 2.6 5 2.6 8 0 3.8-1.5 7.2-4 9.6"
        fill="none"
        stroke="url(#bossnu-mark)"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity=".9"
      />
      <circle cx="24.8" cy="7.2" r="1.35" fill="#e879f9" />
    </svg>
  );
}

/** @deprecated use GuPanuMark */
export const ForgeMark = GuPanuMark;

export function GuPanuWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <GuPanuMark className="size-7" />
      <span className="font-display text-lg font-semibold tracking-tight">{BRAND.name}</span>
    </span>
  );
}

/** @deprecated use GuPanuWordmark */
export const ForgeWordmark = GuPanuWordmark;
