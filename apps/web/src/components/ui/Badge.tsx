"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Badge v2.0
 * Subtle backgrounds only — no bright pills, no solid fills.
 * Height: 22px. Pill shape. Tight padding.
 */

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "outline" | "destructive" | "live" | "error";
  size?: "sm" | "default";
  dot?: boolean;
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  // Neutral (Gray)
  neutral:     "bg-transparent text-[var(--text-secondary)] border border-[var(--border-default)]",
  outline:     "bg-transparent text-[var(--text-secondary)] border border-[var(--border-default)]",
  live:        "bg-transparent text-[var(--text-secondary)] border border-[var(--border-default)]",

  // Accent (Teal)
  accent:      "bg-transparent text-[var(--accent)] border border-[var(--accent)]",
  success:     "bg-transparent text-[var(--accent)] border border-[var(--accent)]",
  info:        "bg-transparent text-[var(--accent)] border border-[var(--accent)]",

  // Danger (Red)
  warning:     "bg-transparent text-[var(--danger)] border border-[var(--danger)]",
  danger:      "bg-transparent text-[var(--danger)] border border-[var(--danger)]",
  destructive: "bg-transparent text-[var(--danger)] border border-[var(--danger)]",
  error:       "bg-transparent text-[var(--danger)] border border-[var(--danger)]",
};

const dotColors: Record<NonNullable<BadgeProps["variant"]>, string> = {
  // Neutral (Gray)
  neutral:     "bg-[var(--text-muted)]",
  outline:     "bg-[var(--text-muted)]",
  live:        "bg-[var(--text-muted)] live-pulse",

  // Accent (Teal)
  accent:      "bg-[var(--accent)]",
  success:     "bg-[var(--accent)]",
  info:        "bg-[var(--accent)]",

  // Danger (Red)
  warning:     "bg-[var(--danger)]",
  danger:      "bg-[var(--danger)]",
  destructive: "bg-[var(--danger)]",
  error:       "bg-[var(--danger)]",
};

export function Badge({
  className,
  variant = "neutral",
  size = "default",
  dot,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-default)] font-medium leading-none whitespace-nowrap",
        size === "sm" ? "h-5 px-2 text-[10px]" : "h-[22px] px-2.5 text-[11px]",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}
