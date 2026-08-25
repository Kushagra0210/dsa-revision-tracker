import * as React from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} className={cn(fieldClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClasses, "min-h-[70px] py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClasses, "appearance-none bg-card pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-medium leading-none text-muted-foreground", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  children,
  tone = "default",
}: {
  className?: string;
  children?: React.ReactNode;
  tone?: "default" | "easy" | "medium" | "hard" | "overdue" | "due" | "upcoming" | "completed";
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    easy: "bg-success/15 text-success",
    medium: "bg-warning/15 text-warning",
    hard: "bg-danger/15 text-danger",
    overdue: "bg-danger/15 text-danger",
    due: "bg-primary/15 text-primary",
    upcoming: "bg-muted text-muted-foreground",
    completed: "bg-success/15 text-success",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
