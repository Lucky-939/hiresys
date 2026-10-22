"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys KPI Card v2.0
 * Height: 148px. Radius: --radius-card (16px).
 * Zones: Label → Value → Context/Empty.
 * No sparklines with fake data. No trend percentages.
 * Value animates up from 0 on mount (real data only).
 */

interface KPICardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  context?: string;       /* Optional real context, e.g. "across 3 orgs" */
  emptyMessage?: string;
  emptyAction?: () => void;
  emptyActionLabel?: string;
  loading?: boolean;
  className?: string;
}

function useCount(target: number, duration = 500): number {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (typeof target !== "number" || target === 0) { setCount(0); return; }
    let raf: number;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

export function KPICard({
  title, value, icon, context, emptyMessage, emptyAction, emptyActionLabel, loading, className
}: KPICardProps) {
  const numericValue = typeof value === "number" ? value : 0;
  const animated = useCount(numericValue);
  const isEmpty = numericValue === 0 && typeof value === "number";

  if (loading) {
    return (
      <div className={cn(
        "h-[148px] p-6",
        "flex flex-col gap-3 justify-between",
        className
      )}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 skeleton rounded" />
          <div className="h-3 w-20 skeleton rounded" />
        </div>
        <div className="h-8 w-14 skeleton rounded" />
        <div className="h-3 w-24 skeleton rounded" />
      </div>
    );
  }

  return (
    <div className={cn(
      "h-[148px] p-6 flex flex-col justify-between",
      className
    )}>
      {/* Label + Icon */}
      <div className="flex items-center gap-2">
        {icon && (
          <span className="text-[var(--text-muted)] flex items-center shrink-0">{icon}</span>
        )}
        <span className="text-[14px] font-medium text-[var(--text-secondary)] tracking-tight leading-none">
          {title}
        </span>
      </div>

      {/* Value */}
      <span className="text-[40px] font-bold font-mono leading-none tracking-tight text-[var(--text-primary)]">
        {typeof value === "string" ? value : animated}
      </span>

      {/* Context / Empty */}
      <div className="flex items-center justify-between">
        {isEmpty && emptyMessage ? (
          <span className="text-[12px] text-[var(--text-muted)]">{emptyMessage}</span>
        ) : context ? (
          <span className="text-[12px] text-[var(--text-muted)]">{context}</span>
        ) : (
          <span />
        )}
        {isEmpty && emptyAction && emptyActionLabel && (
          <button
            onClick={emptyAction}
            className="text-[12px] font-semibold text-[var(--accent)] hover:text-[var(--accentHover)] transition-colors"
          >
            {emptyActionLabel} →
          </button>
        )}
      </div>
    </div>
  );
}
