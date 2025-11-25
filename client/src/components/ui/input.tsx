import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, id, ...props }, ref) => {
  const generatedId = React.useId();
  const resolvedId = id ?? `input-${generatedId}`;

  return (
    <input
      id={resolvedId}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
