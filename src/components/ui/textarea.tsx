import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-24 w-full resize-none bg-transparent text-base text-fg",
          "placeholder:text-subtle focus-visible:outline-none disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
