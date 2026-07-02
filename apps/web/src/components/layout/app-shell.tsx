"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { CommandPalette } from "@/components/ui/command-palette";

/**
 * HireSys AppShell v2.0
 * Layout: Sidebar (fixed) + TopBar (60px) + Page Content (scrollable)
 * Page padding: 32px horizontal, 28px top, 48px bottom
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (window.innerWidth < 1280) setCollapsed(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar setCommandOpen={setCommandOpen} />

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="px-8 pt-7 pb-12 h-full flex flex-col">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Command palette */}
      <CommandPalette open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
}
