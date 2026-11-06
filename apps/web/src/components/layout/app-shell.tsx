"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { CommandPalette } from "@/components/ui/command-palette";

/**
 * HireSys AppShell v2.0 — Responsive Enterprise Layout
 *
 * Structure:
 *   Desktop (≥1024px): Docked Sidebar (264px expanded / 72px collapsed)
 *   Mobile (<1024px): Off-canvas animated Drawer with overlay backdrop + TopBar Hamburger trigger
 *   TopBar: Fixed 64px with responsive breadcrumbs, search, and action items
 *   Content: Scrollable, max-w-[var(--content-max-width)], adaptive horizontal padding
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    // Auto-collapse on narrower desktop/laptop screens
    if (window.innerWidth < 1280) setCollapsed(true);
  }, []);

  // Automatically close mobile drawer when navigating between pages
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">

      {/* Sidebar — docked on desktop, sliding drawer on mobile/tablet */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main area — TopBar + scrollable content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* TopBar — fixed 64px with hamburger for mobile */}
        <TopBar
          setCommandOpen={setCommandOpen}
          onToggleMobileMenu={() => setMobileOpen((prev) => !prev)}
        />

        {/* Scrollable page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden"
          tabIndex={-1}
        >
          {/* Centered content container with fluid mobile-first padding */}
          <div className="w-full max-w-[var(--content-max-width)] mx-auto px-3.5 sm:px-6 xl:px-8 pt-4 sm:pt-8 pb-12">
            {children}
          </div>
        </main>
      </div>

      {/* Command palette — portal-level overlay */}
      <CommandPalette open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
}
