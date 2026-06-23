"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/ui/Icons";

export function TopBar({ setCommandOpen }: { setCommandOpen: (o: boolean) => void }) {
  const pathname = usePathname();
  
  // Create simple breadcrumbs from pathname
  const paths = pathname.split("/").filter(Boolean);
  const breadcrumbs = paths.map((path, idx) => {
    const isLast = idx === paths.length - 1;
    const name = path.charAt(0).toUpperCase() + path.slice(1);
    return { name, isLast };
  });

  return (
    <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-6">
      
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm">
        {breadcrumbs.map((bc, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="mx-2 text-[var(--border-strong)]">/</span>}
            <span className={bc.isLast ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"}>
              {bc.name}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <button
          onClick={() => setCommandOpen(true)}
          className="flex h-8 items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-3 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] w-48 sm:w-64"
        >
          <span className="flex shrink-0">{Icons.search}</span>
          <span className="flex-1 text-left truncate">Search candidates...</span>
          <div className="hidden items-center gap-1 sm:flex text-[10px] font-mono opacity-60">
            <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1">⌘</kbd>
            <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1">K</kbd>
          </div>
        </button>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--danger)] border border-[var(--bg-surface)]" />
        </button>

        {/* Avatar Placeholder */}
        <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs shadow-sm cursor-pointer border border-[var(--border-subtle)]">
          L
        </div>
      </div>
    </header>
  );
}
