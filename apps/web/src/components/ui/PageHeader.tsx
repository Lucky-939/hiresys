import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys PageHeader v2.0
 * H1: 32px / 700. One per page only.
 * Description: 15px / 400 / text-secondary.
 * Actions: right-aligned, max 2 buttons.
 */

import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  backHref,
  backLabel = "Back",
  onBack,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 mb-8", className)}>
      {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
      {(backHref || onBack) && (
        <div className="mb-3">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="group-hover:-translate-x-0.5 transition-transform">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>{backLabel}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group cursor-pointer bg-transparent border-0 p-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="group-hover:-translate-x-0.5 transition-transform">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>{backLabel}</span>
            </button>
          )}
        </div>
      )}
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-3 min-w-0">
          <h1 className="text-[32px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed max-w-[560px]">
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
 * ScoreBar â€” Horizontal confidence bar.
 * Circular gauges are BANNED. Use this for all score visualization.
 */
interface ScoreBarProps {
  label: string;
  score: number;       /* 0â€“100 */
  maxScore?: number;
  variant?: "default" | "success" | "warning" | "danger";
  showValue?: boolean;
  className?: string;
}

const barColors: Record<NonNullable<ScoreBarProps["variant"]>, { track: string; fill: string; text: string }> = {
  default: { track: "bg-[var(--bg-subtle)]",  fill: "bg-[var(--accent)]",    text: "text-[var(--accent)]"       },
  success: { track: "bg-[var(--accent-muted)]", fill: "bg-[var(--accent)]", text: "text-[var(--accent)]" },
  warning: { track: "bg-[var(--danger-muted)]", fill: "bg-[var(--danger)]", text: "text-[var(--danger)]" },
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
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        {showValue && (
          <span className={cn("text-sm font-semibold tabular-nums", text)}>{score}</span>
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
 * AIMatchBar â€” Compact inline confidence bar.
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
  const v = getAutoVariant(score);
  const { fill, text } = barColors[v];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-xs font-medium text-[var(--text-muted)] shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", fill)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn("text-xs font-semibold font-mono tabular-nums shrink-0", text)}>
        {score}%
      </span>
    </div>
  );
}
