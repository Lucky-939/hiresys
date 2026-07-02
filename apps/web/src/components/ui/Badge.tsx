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
  neutral:     "bg-[var(--neutral-bg)]     text-[var(--neutral-text)]  border border-[var(--neutral-border)]",
  accent:      "bg-[var(--accent-muted)]   text-[var(--accent)]        border border-[var(--accent-border)]",
  success:     "bg-[var(--success-bg)]     text-[var(--success-text)]  border border-[var(--success-border)]",
  warning:     "bg-[var(--warning-bg)]     text-[var(--warning-text)]  border border-[var(--warning-border)]",
  danger:      "bg-[var(--danger-bg)]      text-[var(--danger-text)]   border border-[var(--danger-border)]",
  destructive: "bg-[var(--danger-bg)]      text-[var(--danger-text)]   border border-[var(--danger-border)]",
  live:        "bg-[var(--danger-bg)]      text-[var(--danger-text)]   border border-[var(--danger-border)]",
  error:       "bg-[var(--danger-bg)]      text-[var(--danger-text)]   border border-[var(--danger-border)]",
  info:        "bg-[var(--info-bg)]        text-[var(--info-text)]     border border-[var(--info-border)]",
  outline:     "bg-transparent             text-[var(--text-secondary)] border border-[var(--border-default)]",
};

const dotColors: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral:     "bg-[var(--neutral-text)]",
  accent:      "bg-[var(--accent)]",
  success:     "bg-[var(--success)]",
  warning:     "bg-[var(--warning)]",
  danger:      "bg-[var(--danger)]",
  destructive: "bg-[var(--danger)]",
  live:        "bg-[var(--danger)] live-pulse",
  error:       "bg-[var(--danger)]",
  info:        "bg-[var(--info)]",
  outline:     "bg-[var(--text-muted)]",
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
        "inline-flex items-center gap-1.5 rounded-full font-medium leading-none whitespace-nowrap",
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
