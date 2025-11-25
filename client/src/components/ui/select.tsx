import * as React from "react";
import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, id, ...props }, ref) => {
    const generatedId = React.useId();
    const resolvedId = id ?? `select-${generatedId}`;

    return (
      <select
        id={resolvedId}
        ref={ref}
        className={cn(
          "h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
