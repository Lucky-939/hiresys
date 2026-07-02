"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { Icons } from "@/components/ui/Icons";
import { useAuthStore } from "@/store/auth.store";
import { useOrgStore } from "@/store/org.store";
import { useOrganizations } from "@/components/ui/OrganizationSelector";

/**
 * HireSys Sidebar v2.0
 * Background: #111827 (--sidebar-bg)
 * Hover:      #1F2937 (--sidebar-hover)
 * Active:     #5B3FD6 (--sidebar-active)
 * Text:       #E5E7EB (--sidebar-text)
 * Muted:      #9CA3AF (--sidebar-muted)
 * Always dark — theme-independent.
 */

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { selectedOrgId } = useOrgStore();
  const { orgs } = useOrganizations();
  const [aiExpanded, setAiExpanded] = useState(true);

  const isOwner = (user as any)?.role === "OWNER";

  const navItems = [
    { name: "Dashboard",    href: "/dashboard",             icon: Icons.dashboard   },
    { name: "Candidates",   href: "/dashboard/candidates",  icon: Icons.candidates  },
    { name: "Interviews",   href: "/dashboard/interviews",  icon: Icons.interviews  },
    { name: "Pipeline",     href: "/dashboard/pipeline",    icon: Icons.pipeline    },
    { name: "Team",         href: "/dashboard/members",     icon: Icons.team        },
    { name: "Organization", href: "/dashboard/organization",icon: Icons.organization},
  ];

  const aiItems = [
    { name: "Resume Intelligence", href: "/dashboard/resume"       },
    { name: "Interview Copilot",   href: "/dashboard/question-gen" },
    { name: "Coding Rooms",        href: "/dashboard/coding-rooms" },
  ];

  /* ——— Nav item helper ——— */
  function NavItem({ name, href, icon }: { name: string; href: string; icon: React.ReactNode }) {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
    return (
      <Link
        href={href}
        title={collapsed ? name : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-[10px] h-[38px] px-3 text-[13px] font-medium transition-colors duration-150 overflow-hidden",
          isActive
            ? "bg-[var(--sidebar-active)] text-white"
            : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white"
        )}
      >
        <span className="flex h-4 w-4 items-center justify-center shrink-0">{icon}</span>
        {!collapsed && <span className="truncate">{name}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 transition-all duration-200 ease-out relative",
        "bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] shadow-[var(--shadow-sm)] hover:text-[var(--text-primary)] transition-colors z-10"
      >
        <span className={cn("transition-transform duration-200", collapsed ? "rotate-180" : "")}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </span>
      </button>

      {/* Logo + Org selector */}
      <div className="flex flex-col p-3 pb-2 gap-3">
        <Link href="/dashboard" className="flex items-center overflow-hidden h-8 px-1">
          <Logo size="md" withText={!collapsed} isDark />
        </Link>

        {!collapsed && orgs.length > 0 && (
          <div className="relative rounded-[10px] border border-white/8 bg-white/4 px-3 py-2 cursor-pointer hover:bg-white/8 transition-colors group">
            <select
              value={selectedOrgId || ""}
              onChange={(e) => useOrgStore.getState().setSelectedOrgId(e.target.value)}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
              title="Switch Organization"
            >
              {orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-5 rounded-[4px] bg-[var(--accent)] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                {orgs.find(o => o.id === selectedOrgId)?.name?.charAt(0).toUpperCase() || "O"}
              </div>
              <span className="truncate text-[13px] font-medium text-[var(--sidebar-text)]">
                {orgs.find(o => o.id === selectedOrgId)?.name || "Select org"}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-[var(--sidebar-muted)] shrink-0">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--sidebar-muted)]">
            Main
          </span>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5 pb-2">
        {navItems.map(item => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* AI Workspace group */}
        <div className="pt-4">
          {!collapsed ? (
            <button
              onClick={() => setAiExpanded(!aiExpanded)}
              className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] transition-colors"
            >
              AI Workspace
              <svg
                width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={cn("transition-transform duration-200", aiExpanded ? "rotate-180" : "")}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          ) : (
            <div className="h-px bg-white/8 mx-2 my-2" />
          )}

          {(aiExpanded || collapsed) && (
            <div className="mt-1 space-y-0.5">
              {aiItems.map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] h-[34px] px-3 text-[13px] font-medium transition-colors duration-150",
                      collapsed ? "justify-center" : "",
                      isActive
                        ? "bg-[var(--sidebar-active)] text-white"
                        : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
                    )}
                  >
                    {collapsed ? (
                      <span className="text-[9px] font-bold uppercase">{item.name.slice(0, 2)}</span>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-70">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        <span className="truncate">{item.name}</span>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom: Settings + User */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-[var(--sidebar-border)] pt-3">
        <Link
          href="/dashboard/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-[10px] h-[38px] px-3 text-[13px] font-medium transition-colors duration-150",
            pathname === "/dashboard/settings"
              ? "bg-[var(--sidebar-active)] text-white"
              : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
          )}
        >
          <span className="flex h-4 w-4 items-center justify-center shrink-0 opacity-80">{Icons.settings}</span>
          {!collapsed && <span>Settings</span>}
        </Link>

        <Link
          href="/dashboard/settings"
          title={collapsed ? user?.name : undefined}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-[var(--sidebar-hover)] group"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-[13px] font-semibold text-[var(--sidebar-text)] leading-tight">
                {user?.name || "User"}
              </span>
              <span className="truncate text-[11px] text-[var(--sidebar-muted)]">
                {isOwner ? "Owner" : "Member"}
              </span>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
