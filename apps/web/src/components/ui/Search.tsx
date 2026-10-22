"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Search v2.5 — Phase 2.5 Visual Polish
 * Height  : 44px
 * Radius  : 12px (--radius-btn)
 * Border  : 1px, softened (--border-default on idle, --border-strong on hover)
 * Padding : px-4 (16px) internal
 * Shadow  : none
 * Placeholder: lighter, muted
 * ⌘K badge: subtle, no shadow
 */

interface SearchProps {
  onClick?: () => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function Search({
  onClick,
  placeholder = "Search candidates, interviews...",
  className,
  id = "global-search",
}: SearchProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-label="Open search"
      className={cn(
        // Dimensions
        "flex h-[44px] w-full items-center gap-3",
        // Shape
        "rounded-[12px]",
        // Surface
        "border border-[var(--border-default)]",
        "bg-[var(--bg-subtle)]",
        // Spacing
        "px-4",
        // Typography
        "text-[13px] text-[var(--text-muted)]",
        // Transitions
        "transition-colors duration-[var(--ease-base)]",
        // Hover — border darkens, surface lifts one step
        "hover:border-[var(--border-default)] hover:bg-[var(--bg-elevated)]",
        // Focus
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
        className
      )}
    >
      {/* Search icon */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-[var(--text-muted)]"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" />
      </svg>

      {/* Placeholder text */}
      <span className="flex-1 text-left truncate select-none text-[var(--text-muted)]">
        {placeholder}
      </span>

      {/* ⌘K shortcut — placeholder display only */}
      <kbd
        className={cn(
          "hidden sm:inline-flex items-center gap-0.5",
          "rounded-[5px]",
          "border border-[var(--border-default)]",
          "bg-[var(--bg-surface)]",
          "px-1.5 py-0.5",
          "font-mono text-[10px] leading-none text-[var(--text-muted)]",
          "select-none pointer-events-none",
          "shrink-0"
        )}
        aria-hidden="true"
      >
        ⌘K
      </kbd>
    </button>
  );
}
