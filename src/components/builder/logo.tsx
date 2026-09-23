import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export function GuPanuMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <path
        d="M8 22 V10 h6.5 c3.2 0 5.2 1.7 5.2 4.2 0 2.4-2 4.1-5.2 4.1H11.5 V22 H8zm3.5-6.2h2.8c1.4 0 2.2-.7 2.2-1.8s-.8-1.8-2.2-1.8h-2.8v3.6z"
        className="fill-accent-fg"
      />
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
