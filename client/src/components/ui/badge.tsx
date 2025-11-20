import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "info" | "warn" | "error" | "debug" | "default";
}

const toneClass: Record<NonNullable<BadgeProps["tone"]>, string> = {
  info: "bg-sky-900 text-sky-200 border border-sky-700",
  warn: "bg-amber-900 text-amber-100 border border-amber-700",
  error: "bg-red-900 text-red-100 border border-red-700",
  debug: "bg-slate-800 text-slate-200 border border-slate-600",
  default: "bg-emerald-900 text-emerald-100 border border-emerald-700",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone = "default", id, ...props }, ref) => {
    const generatedId = React.useId();
    const resolvedId = id ?? `badge-${generatedId}`;

    return (
      <span
        id={resolvedId}
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          toneClass[tone],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
