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

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { selectedOrgId } = useOrgStore();
  const { orgs } = useOrganizations();
  
  // AI Tools collapse state
  const [aiExpanded, setAiExpanded] = useState(true);

  // Quick check for RBAC (assume role is in user object, or default to MEMBER)
  // For demo, we just assume everyone can see everything except Audit Trail for MEMBER.
  const isOwner = (user as any)?.role === "OWNER";
  const isAdmin = (user as any)?.role === "ADMIN" || isOwner;
  const isMember = (user as any)?.role === "MEMBER";

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Icons.dashboard },
    { name: "Candidates", href: "/dashboard/candidates", icon: Icons.candidates },
    { name: "Interviews", href: "/dashboard/interviews", icon: Icons.interviews },
    { name: "Pipeline", href: "/dashboard/pipeline", icon: Icons.pipeline },
    { name: "Team", href: "/dashboard/members", icon: Icons.team },
    { name: "Organization", href: "/dashboard/organization", icon: Icons.organization },
  ];

  const aiItems = [
    { name: "Resume Review", href: "/dashboard/resume" },
    { name: "Question Gen", href: "/dashboard/question-gen" },
    { name: "Code Feedback", href: "/dashboard/coding-rooms" }, // using coding-rooms for code feedback for now
  ];

  const bottomItems = [
    // Removed reports and audit trail as they are currently non-functional
  ];

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)] transition-all duration-200 ease-in-out relative",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] shadow-sm hover:text-[var(--text-primary)] transition-colors z-10"
      >
        <span className={cn("transition-transform duration-200", collapsed ? "rotate-180" : "")}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </span>
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 p-4 pb-2">
        <Link href="/dashboard" className="flex items-center overflow-hidden h-8">
          <Logo size="md" withText={!collapsed} />
        </Link>
        
        {!collapsed && (
          <div className="flex items-center justify-between rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] cursor-pointer hover:bg-[var(--border-subtle)] transition-colors relative">
            <select
               value={selectedOrgId || ""}
               onChange={(e) => useOrgStore.getState().setSelectedOrgId(e.target.value)}
               className="w-full bg-transparent border-none outline-none cursor-pointer appearance-none absolute inset-0 pl-3 pr-8 opacity-0 z-10"
               title="Switch Organization"
            >
               {orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
               {orgs.length === 0 && <option value="">No Orgs Found</option>}
            </select>
            <span className="truncate">{orgs.find(o => o.id === selectedOrgId)?.name || "Select Org"}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none"><polyline points="8 10 12 14 16 10"></polyline></svg>
          </div>
        )}
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--accent-muted)] text-[var(--accent)] shadow-[inset_3px_0_0_0_var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* AI Tools Group */}
        <div className="mt-6 mb-2">
          {!collapsed ? (
            <button
              onClick={() => setAiExpanded(!aiExpanded)}
              className="flex w-full items-center justify-between px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors"
            >
              AI Tools
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("transition-transform duration-200", aiExpanded ? "rotate-180" : "")}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          ) : (
            <div className="px-3 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] mt-4 mb-2">
              AI
            </div>
          )}

          {(aiExpanded || collapsed) && (
            <div className={cn("mt-1 space-y-1", collapsed ? "" : "ml-4 border-l border-[var(--border-default)] pl-2")}>
              {aiItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md py-1.5 text-sm transition-colors",
                      collapsed ? "justify-center px-0 h-9 w-9 mx-auto" : "px-3 font-medium",
                      isActive
                        ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                    )}
                  >
                    {collapsed ? (
                      <span className="text-[var(--accent)] font-bold text-[10px]">AI</span>
                    ) : (
                      <>
                        <span className="truncate">{item.name}</span>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="p-3 border-t border-[var(--border-default)] space-y-1">
        {/* Settings button added to the bottom directly since bottomItems was removed */}
        <Link
          href="/dashboard/organization"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
            pathname === "/dashboard/organization" ? "bg-[var(--accent-muted)] text-[var(--accent)] shadow-[inset_3px_0_0_0_var(--accent)]" : ""
          )}
        >
          <span className="flex h-5 w-5 items-center justify-center shrink-0">{Icons.settings}</span>
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* User Profile */}
        <Link
          href="/dashboard/profile"
          title={collapsed ? user?.name : undefined}
          className="flex items-center gap-3 rounded-md px-3 py-2 mt-2 transition-colors hover:bg-[var(--bg-elevated)] group"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
            {user?.name?.charAt(0) || "U"}
          </div>
          {!collapsed && (
            <div className="flex flex-1 items-center justify-between overflow-hidden">
              <span className="truncate text-sm font-medium text-[var(--text-primary)]">{user?.name || "User"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-subtle)] opacity-0 transition-opacity group-hover:opacity-100"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
