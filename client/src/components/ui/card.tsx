import * as React from "react";
import { cn } from "../../lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const resolvedId = id ?? `card-${generatedId}`;

    return (
      <div
        id={resolvedId}
        ref={ref}
        className={cn("rounded-xl border border-slate-800 bg-slate-900/60 p-4", className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
