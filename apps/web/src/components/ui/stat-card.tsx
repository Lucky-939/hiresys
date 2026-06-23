"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number; // e.g. 12 for 12%, -5 for -5%
  trendLabel?: string; // e.g. "vs last month"
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

export function StatCard({ title, value, icon, trend, trendLabel, className }: StatCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <div className={cn("flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm hover:shadow-md transition-shadow", className)}>
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-semibold", trend >= 0 ? "text-[var(--success-text)]" : "text-[var(--danger-text)]")}>
            <span>{trend >= 0 ? "↑" : "↓"}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-1">
        <h3 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {animatedValue}
        </h3>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--text-muted)]">{title}</span>
          {trendLabel && <span className="text-[var(--text-subtle)] text-xs">{trendLabel}</span>}
        </div>
      </div>
    </div>
  );
}
