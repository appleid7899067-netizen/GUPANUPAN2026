import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight tooltip implementation.
 *
 * The previous Radix Tooltip wrapper could trigger React 19 update-depth
 * failures during the initial production render. Keep tooltips dependency-free
 * so the root app can render deterministically.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({
  children,
  label,
  side = "bottom",
}: {
  children: ReactNode;
  label: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const sideClass =
    side === "top"
      ? "bottom-full left-1/2 mb-1.5 -translate-x-1/2"
      : side === "left"
        ? "right-full top-1/2 mr-1.5 -translate-y-1/2"
        : side === "right"
          ? "left-full top-1/2 ml-1.5 -translate-y-1/2"
          : "left-1/2 top-full mt-1.5 -translate-x-1/2";

  return (
    <span className="group relative inline-flex" title={label}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-sm bg-fg px-2 py-1 text-xs text-bg shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
          sideClass,
        )}
      >
        {label}
      </span>
    </span>
  );
}
