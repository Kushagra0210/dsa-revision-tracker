import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "danger" | "success" | "secondary";
type ButtonSize = "default" | "sm" | "lg";

const variants: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-muted text-foreground hover:bg-accent",
  outline: "border border-input bg-transparent hover:bg-muted",
  ghost: "hover:bg-muted",
  danger: "bg-danger text-white hover:opacity-90",
  success: "bg-success text-white hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-9 px-4 text-sm",
  sm: "h-7 px-2.5 text-xs",
  lg: "h-11 px-6 text-base",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
