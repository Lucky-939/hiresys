"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { CommandPalette } from "@/components/ui/command-palette";

/**
 * HireSys AppShell v2.0 — Phase 2 Layout Framework
 *
 * Structure:
 *   Sidebar (fixed, dark, 264px expanded / 72px collapsed)
 *   TopBar  (fixed, 64px, white, bottom-border only)
 *   Content (scrollable, max-w-[1600px], centered)
 *
 * Responsive padding:
 *   Desktop (≥1280px) : 32px  (px-8)
 *   Tablet  (≥768px)  : 24px  (px-6)
 *   Mobile  (<768px)  : 16px  (px-4)
 *
 * Section spacing: controlled by templates (gap-8 = 32px).
 * Sidebar and TopBar are fixed; only the content area scrolls.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-collapse on narrower screens
    if (window.innerWidth < 1280) setCollapsed(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">

      {/* Sidebar — fixed left column */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main area — TopBar + scrollable content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* TopBar — fixed, 64px */}
        <TopBar setCommandOpen={setCommandOpen} />

        {/* Scrollable page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden"
          tabIndex={-1}
        >
          {/* Centered content container — max 1600px */}
          <div className="w-full max-w-[var(--content-max-width)] mx-auto px-4 sm:px-6 xl:px-8 pt-8 pb-12">
            {children}
          </div>
        </main>
      </div>

      {/* Command palette — portal-level overlay */}
      <CommandPalette open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
}
