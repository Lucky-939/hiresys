"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Tabs — Component Library v1.0
 * Spec: Used in Candidate Detail for Overview/Timeline/Resume/Interviews/Activity.
 * Border-bottom style. Accent indicator on active. Never pill tabs on detail pages.
 */

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "default";
}

export function Tabs({ tabs, activeTab, onChange, className, size = "default" }: TabsProps) {
  return (
    <div className={cn("flex border-b border-[var(--border-default)]", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap font-medium transition-all duration-[var(--ease-base)]",
              "border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              size === "sm"
                ? "px-3 py-2 text-xs"
                : "px-4 py-3 text-sm",
              isActive
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)]"
            )}
            aria-selected={isActive}
            role="tab"
          >
            {tab.icon && <span className="opacity-70">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-[var(--radius-default)] text-[10px] font-semibold",
                isActive
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * HireSys Activity Timeline — Component Library v1.0
 * Spec Vol 4.18: Used in Candidate Detail, Interview Report, Organization Activity.
 * Structure: Dot → Title → Description → Timestamp.
 * Spacing: 20px. Newest first.
 */

interface TimelineItem {
  id?: string;
  type?: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  className?: string;
}

const dotColors: Record<NonNullable<TimelineItem["variant"]>, string> = {
  default: "bg-[var(--border-strong)]",
  accent:  "bg-[var(--accent)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--danger)]",
  danger:  "bg-[var(--danger)]",
};

export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  if (!items.length) return null;

  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--border-default)]" />

      <div className="flex flex-col gap-5">
        {items.map((item, i) => {
          const variant = item.variant ?? "default";
          return (
            <div key={item.id || i} className="relative flex gap-4 pl-6">
              {/* Dot */}
              <div className={cn(
                "absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg-surface)] shrink-0 z-10",
                dotColors[variant]
              )} />
              <div className="flex flex-col gap-0.5 min-w-0 flex-1 pb-1">
                <span className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                  {item.title}
                </span>
                {item.description && (
                  <span className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {item.description}
                  </span>
                )}
                <span className="text-xs text-[var(--text-muted)] mt-0.5">
                  {item.timestamp}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
