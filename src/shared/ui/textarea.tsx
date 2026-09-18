import * as React from "react";

import { cn } from "@/shared/lib";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
