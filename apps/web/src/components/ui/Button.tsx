"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Button v2.0
 * Heights: sm=34px  md=40px  lg=44px  icon=36px
 * Radius: --radius-btn (12px) on all sizes
 * Font: 14px / 600 per spec
 * Variants: default(accent) | secondary | ghost | outline | destructive
 */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "md" | "lg" | "icon";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:     "bg-[var(--accent)] text-white hover:bg-[var(--accentHover)] active:bg-[var(--accent)]",
  primary:     "bg-[var(--accent)] text-white hover:bg-[var(--accentHover)] active:bg-[var(--accent)]",
  secondary:   "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-base)]",
  outline:     "bg-transparent text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-base)]",
  ghost:       "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]",
  destructive: "bg-[var(--danger)] text-white hover:opacity-90 active:opacity-100",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm:      "h-[34px] px-3.5 text-[14px] rounded-[var(--radius-default)]",
  default: "h-[40px] px-4 text-[14px] rounded-[var(--radius-default)]",
  md:      "h-[40px] px-4 text-[14px] rounded-[var(--radius-default)]",
  lg:      "h-[44px] px-5 text-[14px] rounded-[var(--radius-default)]",
  icon:    "h-[36px] w-[36px] rounded-[var(--radius-default)]",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, icon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold",
        "transition-colors duration-[var(--ease-base)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)]",
        "disabled:pointer-events-none disabled:opacity-40",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : null}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { Button };
