import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline" | "info" | "accent" | "neutral" | "error" | "live";
  dot?: boolean;
}

function Badge({ className, variant = "default", dot, children, ...props }: BadgeProps) {
  const variantClasses = {
    default: "border-transparent bg-[var(--accent-muted)] text-[var(--accent)]",
    success: "border-transparent bg-[var(--success-bg)] text-[var(--success-text)]",
    warning: "border-transparent bg-[var(--warning-bg)] text-[var(--warning-text)]",
    destructive: "border-transparent bg-[var(--danger-bg)] text-[var(--danger-text)]",
    outline: "text-[var(--text-primary)] border-[var(--border-default)]",
    info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    accent: "border-transparent bg-[var(--accent)] text-white",
    neutral: "border-transparent bg-[var(--bg-elevated)] text-[var(--text-primary)]",
    error: "border-transparent bg-[var(--danger-bg)] text-[var(--danger-text)]",
    live: "border-transparent bg-rose-100 text-rose-700 animate-pulse",
  };

  const dotColors = {
    default: "bg-[var(--accent)]",
    success: "bg-[var(--success)]",
    warning: "bg-[var(--warning)]",
    destructive: "bg-[var(--danger)]",
    outline: "bg-[var(--text-muted)]",
    info: "bg-blue-500",
    accent: "bg-white",
    neutral: "bg-[var(--text-tertiary)]",
    error: "bg-[var(--danger)]",
    live: "bg-rose-500",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", dotColors[variant])}
        />
      )}
      {children}
    </div>
  )
}

export { Badge }
