import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Empty State v2.0
 * Pattern: Icon → Title → Description (1 sentence) → Primary CTA → Optional secondary
 * No illustrations, mascots, confetti, or decorative SVGs.
 * Tone: Professional, factual.
 */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-10 gap-3" : "py-16 gap-4 min-h-[280px]",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-[var(--radius-default)]",
            "border border-[var(--border-default)] bg-[var(--bg-subtle)]",
            "text-[var(--text-muted)]",
            compact ? "h-10 w-10" : "h-12 w-12"
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1.5 max-w-[260px]">
        <h3
          className={cn(
            "font-semibold text-[var(--text-primary)]",
            compact ? "text-base" : "text-lg"
          )}
        >
          {title}
        </h3>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
      {secondaryAction && (
        <div className="text-sm text-[var(--text-muted)]">{secondaryAction}</div>
      )}
    </div>
  );
}
