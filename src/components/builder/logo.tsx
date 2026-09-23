import { cn } from "@/lib/utils";

export function ForgeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <rect x="8" y="9" width="16" height="3.2" rx="1.4" className="fill-accent-fg" />
      <rect x="8" y="14.4" width="12" height="3.2" rx="1.4" className="fill-accent-fg" />
      <rect x="8" y="19.8" width="8" height="3.2" rx="1.4" className="fill-accent-fg" />
    </svg>
  );
}

export function ForgeWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <ForgeMark className="size-7" />
      <span className="font-display text-lg font-semibold tracking-tight">Forge</span>
    </span>
  );
}
