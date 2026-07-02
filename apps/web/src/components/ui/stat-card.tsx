"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number; // e.g. 12 for 12%, -5 for -5%
  trendLabel?: string; // e.g. "vs last month"
  emptyMessage?: string;
  emptyAction?: () => void;
  emptyActionLabel?: string;
  className?: string;
}

function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

export function StatCard({ title, value, icon, trend, trendLabel, emptyMessage, emptyAction, emptyActionLabel, className }: StatCardProps) {
  const animatedValue = useCountUp(value);

  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  // Generate some dummy data for the mini chart based on trend direction
  const chartData = Array.from({ length: 7 }).map((_, i) => ({
    val: isPositive ? 10 + (i * 2) + Math.random() * 5 : isNegative ? 20 - (i * 2) + Math.random() * 5 : 15 + Math.random() * 5
  }));

  const strokeColor = isPositive ? "var(--success)" : isNegative ? "var(--danger)" : "var(--text-subtle)";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm transition-all hover:shadow-md hover:border-[var(--border-strong)] flex flex-col group",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-110">
          {icon}
        </div>
        <h3 className="text-[14px] font-bold tracking-tight text-[var(--text-primary)]">{title}</h3>
      </div>
      
      <div className="flex items-end justify-between flex-1 mt-2">
        <div className="flex flex-col">
          <div className="text-[36px] font-black tracking-tighter text-[var(--text-primary)] leading-none">{animatedValue}</div>
          
          {value === 0 && emptyMessage ? (
            <div className="mt-2 text-[11px] font-medium text-[var(--text-muted)]">
              {emptyMessage}
            </div>
          ) : trend !== undefined ? (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold">
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
                  isPositive && "bg-[var(--success-bg)]/50 text-[var(--success-text)]",
                  isNegative && "bg-[var(--danger-bg)]/50 text-[var(--danger-text)]",
                  !isPositive && !isNegative && "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                )}
              >
                {isPositive && "↑"}
                {isNegative && "↓"}
                {!isPositive && !isNegative && "−"}
                {Math.abs(trend)}%
              </span>
              {trendLabel && <span className="text-[var(--text-muted)] font-medium">{trendLabel}</span>}
            </div>
          ) : null}
        </div>

        {/* Mini Chart */}
        <div className="h-10 w-20 opacity-60 group-hover:opacity-100 transition-opacity ml-4">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
            <polyline 
              fill="none" 
              stroke={strokeColor} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              points={chartData.map((d, i) => `${(i / 6) * 100},${40 - (d.val / 30) * 40}`).join(' ')} 
            />
          </svg>
        </div>
      </div>
      {value === 0 && emptyAction && emptyActionLabel && (
        <button 
          onClick={emptyAction}
          className="mt-4 text-left text-[12px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors w-fit"
        >
          {emptyActionLabel}
        </button>
      )}
    </div>
  );
}
