"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/ui/Icons";
import { useAuthStore } from "@/store/auth.store";
import { useOrgStore } from "@/store/org.store";
import { useOrganizations } from "@/components/ui/OrganizationSelector";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

const navItems = [
  { name: "Dashboard",    href: "/dashboard",              icon: Icons.dashboard    },
  { name: "Candidates",   href: "/dashboard/candidates",   icon: Icons.candidates   },
  { name: "Jobs",         href: "/dashboard/jobs",         icon: Icons.jobs         },
  { name: "Interviews",   href: "/dashboard/interviews",   icon: Icons.interviews   },
  { name: "Pipeline",     href: "/dashboard/pipeline",     icon: Icons.pipeline     },
  { name: "Team",         href: "/dashboard/members",      icon: Icons.team         },
  { name: "Organization", href: "/dashboard/organization", icon: Icons.organization },
];

const aiItems = [
  { name: "Resume Intelligence", href: "/dashboard/resume",       icon: Icons.resume       },
  { name: "Interview Copilot",   href: "/dashboard/question-gen", icon: Icons.questionGen  },
  { name: "Coding Rooms",        href: "/dashboard/coding-rooms", icon: Icons.codingRooms  },
];

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { selectedOrgId } = useOrgStore();
  const { orgs } = useOrganizations();
  const [aiExpanded, setAiExpanded] = useState(true);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  /* ——— Nav Item Component ——— */
  function NavItem({
    name,
    href,
    icon,
    isMobile = false,
  }: {
    name: string;
    href: string;
    icon: React.ReactNode;
    isMobile?: boolean;
  }) {
    const isActive =
      pathname === href ||
      (href !== "/dashboard" && pathname.startsWith(href + "/"));
    const isCollapsedItem = !isMobile && collapsed;

    return (
      <Link
        href={href}
        title={isCollapsedItem ? name : undefined}
        aria-current={isActive ? "page" : undefined}
        onClick={() => {
          if (isMobile) setMobileOpen?.(false);
        }}
        className={cn(
          "relative flex items-center gap-3 h-[44px] px-3 rounded-[var(--radius-default)]",
          "text-[14px] font-semibold",
          "transition-colors duration-[var(--ease-base)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset",
          "overflow-hidden",
          isActive
            ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-default)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent",
          isCollapsedItem && "justify-center px-0"
        )}
      >
        {isActive && (
          <span
            className="absolute left-0 top-[8px] bottom-[8px] w-[2px] rounded-r-full bg-[var(--accent)]"
            aria-hidden="true"
          />
        )}
        <span
          className={cn(
            "flex items-center justify-center shrink-0 h-4 w-4",
            isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        {!isCollapsedItem && (
          <span className="truncate leading-none">{name}</span>
        )}
      </Link>
    );
  }

  /* ——— Render Inner Navigation Content ——— */
  const renderSidebarContent = (isMobile: boolean = false) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <>
        {/* ——— Logo Row ——— */}
        <div
          className={cn(
            "flex items-center shrink-0",
            "h-[var(--sidebar-logo-height)]",
            "bg-[var(--bg-surface)]",
            "border-b border-[var(--border-default)]",
            isCollapsed ? "px-6 justify-center" : "px-4 sm:px-6 justify-between"
          )}
        >
          <Link
            href="/dashboard"
            onClick={() => isMobile && setMobileOpen?.(false)}
            aria-label="HireSys home"
            className={cn(
              "flex items-center overflow-hidden shrink-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-default)]",
              isCollapsed ? "justify-center" : "gap-0"
            )}
          >
            <img
              src={isCollapsed ? "/branding/logo-icon.svg" : "/branding/logo-nav.svg"}
              alt="HireSys Logo"
              className={cn(isCollapsed ? "h-8 w-auto" : "w-[170px] sm:w-[190px] h-auto object-contain object-left -ml-2")}
            />
          </Link>

          {/* Desktop collapse toggle */}
          {!isMobile && !collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className={cn(
                "flex h-7 w-7 items-center justify-center shrink-0",
                "rounded-[var(--radius-default)]",
                "text-[var(--text-muted)]",
                "hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-default)]",
                "transition-colors duration-[var(--ease-base)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Mobile close button */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen?.(false)}
              aria-label="Close sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-default)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* ——— Main Navigation List ——— */}
        <nav
          className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-0.5"
          aria-label="Main navigation"
        >
          {!isCollapsed && (
            <div className="px-3 pb-2 pt-0">
              <span className="text-[11px] font-mono font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">
                Main
              </span>
            </div>
          )}

          {navItems.map((item) => {
            if (selectedOrg?.role === "INTERVIEWER" && ["Dashboard", "Organization", "Candidates", "Jobs", "Pipeline", "Team"].includes(item.name)) {
              return null;
            }
            return <NavItem key={item.href} {...item} isMobile={isMobile} />;
          })}

          {/* AI Workspace Group */}
          <div className="pt-6">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setAiExpanded(!aiExpanded)}
                aria-expanded={aiExpanded}
                className={cn(
                  "flex w-full items-center justify-between",
                  "px-3 py-1",
                  "text-[11px] font-mono font-medium uppercase tracking-[0.04em]",
                  "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  "transition-colors duration-[var(--ease-base)]",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] rounded"
                )}
              >
                <span>AI Workspace</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={cn(
                    "text-[var(--text-muted)] transition-transform duration-[var(--ease-base)]",
                    !aiExpanded && "-rotate-90"
                  )}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            ) : (
              <div className="mx-auto my-1 w-6 border-t border-[var(--border-default)]" />
            )}

            {(aiExpanded || isCollapsed) && (
              <div className="mt-1 space-y-0.5">
                {aiItems.map((item) => (
                  <NavItem key={item.href} {...item} isMobile={isMobile} />
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* ——— Bottom Utility Strip ——— */}
        <div className="shrink-0 border-t border-[var(--border-default)] p-3">
          <Link
            href="/dashboard/settings"
            onClick={() => isMobile && setMobileOpen?.(false)}
            title={isCollapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center gap-3 h-[40px] px-3 rounded-[var(--radius-default)]",
              "text-[14px] font-semibold",
              "transition-colors duration-[var(--ease-base)]",
              pathname === "/dashboard/settings"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
              isCollapsed && "justify-center px-0"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center shrink-0 h-4 w-4",
                pathname === "/dashboard/settings" ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
                !isCollapsed && "ml-0.5"
              )}
            >
              {Icons.settings}
            </span>
            {!isCollapsed && <span className="truncate leading-none">Settings</span>}
          </Link>

          {/* Profile row */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-default)] mt-1",
              "transition-colors duration-[var(--ease-base)]",
              "hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-default)]",
              "cursor-default",
              isCollapsed && "justify-center px-0"
            )}
            title={isCollapsed ? (user?.name ?? "User") : undefined}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-default)] bg-[var(--accent)] text-[13px] font-bold text-white select-none"
              aria-hidden="true"
            >
              {selectedOrg?.name?.charAt(0)?.toUpperCase() ?? "O"}
            </div>

            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="truncate text-[14px] font-semibold text-[var(--text-primary)] leading-snug">
                  {user?.name ?? "User"}
                </span>
                <span className="truncate text-[12px] text-[var(--text-muted)] leading-snug mt-0.5">
                  {selectedOrg?.name ?? ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {/* 1. Desktop Docked Sidebar (lg and above) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 h-full",
          "bg-[var(--bg-base)]",
          "border-r border-[var(--border-default)]",
          "transition-all duration-200 ease-out",
          "relative",
          collapsed
            ? "w-[var(--sidebar-width-collapsed)]"
            : "w-[var(--sidebar-width-expanded)]"
        )}
      >
        {renderSidebarContent(false)}

        {/* Expand toggle — visible only when collapsed on desktop */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className={cn(
              "absolute -right-3 top-[28px]",
              "flex h-6 w-6 items-center justify-center",
              "rounded-full",
              "border border-[var(--border-default)]",
              "bg-[var(--bg-surface)]",
              "text-[var(--text-muted)]",
              "hover:text-[var(--text-primary)]",
              "transition-colors duration-[var(--ease-base)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              "z-10 cursor-pointer shadow-sm"
            )}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </aside>

      {/* 2. Mobile / Tablet Drawer & Backdrop Overlay (< lg) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay with blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen?.(false)}
            aria-hidden="true"
          />

          {/* Sliding drawer panel */}
          <aside
            className="fixed inset-y-0 left-0 w-[280px] bg-[var(--bg-base)] border-r border-[var(--border-default)] z-50 flex flex-col shadow-2xl transition-transform animate-in slide-in-from-left duration-200"
            aria-label="Mobile navigation drawer"
          >
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
