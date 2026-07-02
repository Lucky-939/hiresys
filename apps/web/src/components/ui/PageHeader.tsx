import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys PageHeader v2.0
 * H1: 32px / 700. One per page only.
 * Description: 15px / 400 / text-secondary.
 * Actions: right-aligned, max 2 buttons.
 */

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {breadcrumb && <div className="mb-3">{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-[32px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-[var(--text-base)] text-[var(--text-secondary)] leading-relaxed max-w-[560px]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 pt-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ScoreBar — Horizontal confidence bar.
 * Circular gauges are BANNED. Use this for all score visualization.
 */
interface ScoreBarProps {
  label: string;
  score: number;       /* 0–100 */
  maxScore?: number;
  variant?: "default" | "success" | "warning" | "danger";
  showValue?: boolean;
  className?: string;
}

const barColors: Record<NonNullable<ScoreBarProps["variant"]>, { track: string; fill: string; text: string }> = {
  default: { track: "bg-[var(--bg-secondary)]",  fill: "bg-[var(--accent)]",    text: "text-[var(--accent)]"       },
  success: { track: "bg-[var(--success-bg)]",    fill: "bg-[var(--success)]",   text: "text-[var(--success-text)]" },
  warning: { track: "bg-[var(--warning-bg)]",    fill: "bg-[var(--warning)]",   text: "text-[var(--warning-text)]" },
  danger:  { track: "bg-[var(--danger-bg)]",     fill: "bg-[var(--danger)]",    text: "text-[var(--danger-text)]"  },
};

function getAutoVariant(score: number): NonNullable<ScoreBarProps["variant"]> {
  if (score >= 80) return "success";
  if (score >= 60) return "default";
  if (score >= 40) return "warning";
  return "danger";
}

export function ScoreBar({ label, score, maxScore = 100, variant, showValue = true, className }: ScoreBarProps) {
  const v = variant ?? getAutoVariant(score);
  const { track, fill, text } = barColors[v];
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">{label}</span>
        {showValue && (
          <span className={cn("text-[var(--text-sm)] font-semibold tabular-nums", text)}>{score}</span>
        )}
      </div>
      <div className={cn("h-1.5 w-full rounded-full overflow-hidden", track)}>
        <div
          className={cn("h-full rounded-full score-bar-fill transition-all duration-700 ease-out", fill)}
          style={{ width: `${pct}%`, "--bar-width": `${pct}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

/**
 * AIMatchBar — Compact inline confidence bar.
 */
export function AIMatchBar({
  score,
  label = "AI Match",
  className,
}: {
  score: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-[var(--text-xs)] font-medium text-[var(--text-muted)] shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-700 ease-out"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[var(--text-xs)] font-semibold text-[var(--accent)] tabular-nums shrink-0">
        {score}%
      </span>
    </div>
  );
}
