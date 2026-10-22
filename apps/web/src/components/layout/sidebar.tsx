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
 * HireSys Sidebar v2.0 — Phase 2 Layout Framework
 *
 * Dimensions:
 *   Expanded : 264px  (--sidebar-width-expanded)
 *   Collapsed: 72px   (--sidebar-width-collapsed)
 *   Logo row : 72px   (--sidebar-logo-height)
 *
 * Colors — always dark, theme-independent:
 *   Background : #111827  (--sidebar-bg)
 *   Hover      : #1F2937  (--sidebar-hover)
 *   Active     : #5B3FD6  (--sidebar-active)
 *   Text       : #E5E7EB  (--sidebar-text)
 *   Muted      : #9CA3AF  (--sidebar-muted)
 *   Border     : #1F2937  (--sidebar-border)
 *
 * Rules:
 *   - No gradients, no glow, no blur, no transparency
 *   - Active nav item: solid fill + white text + 2px left border indicator
 *   - Sidebar must be visually quieter than page content
 */

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
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

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { selectedOrgId } = useOrgStore();
  const { orgs } = useOrganizations();
  const [aiExpanded, setAiExpanded] = useState(true);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  /* ——— Nav Item ——— */
  function NavItem({
    name,
    href,
    icon,
  }: {
    name: string;
    href: string;
    icon: React.ReactNode;
  }) {
    const isActive =
      pathname === href ||
      (href !== "/dashboard" && pathname.startsWith(href + "/"));

    return (
      <Link
        href={href}
        title={collapsed ? name : undefined}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative flex items-center gap-3 h-[44px] px-3 rounded-[var(--radius-default)]",
          "text-[14px] font-semibold",
          "transition-colors duration-[var(--ease-base)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset",
          "overflow-hidden",
          isActive
            ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-default)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent",
          collapsed && "justify-center px-0"
        )}
      >
        {/* 2px left active indicator */}
        {isActive && (
          <span
            className="absolute left-0 top-[8px] bottom-[8px] w-[2px] rounded-r-full bg-[var(--accent)]"
            aria-hidden="true"
          />
        )}
        {/* Icon */}
        <span
          className={cn(
            "flex items-center justify-center shrink-0",
            "h-4 w-4",
            isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
            !collapsed && "ml-0.5"
          )}
        >
          {icon}
        </span>
        {/* Label */}
        {!collapsed && (
          <span className="truncate leading-none">{name}</span>
        )}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 h-full",
        "bg-[var(--bg-base)]",
        "border-r border-[var(--border-default)]",
        "transition-all duration-200 ease-out",
        "relative",
        collapsed
          ? "w-[var(--sidebar-width-collapsed)]"
          : "w-[var(--sidebar-width-expanded)]"
      )}
    >
      {/* ——— Logo Row ——— */}
      <div
        className={cn(
          "flex items-center shrink-0",
          "h-[var(--sidebar-logo-height)]",
          "bg-[var(--bg-surface)]",
          "border-b border-[var(--border-default)]",
          collapsed ? "px-6 justify-center" : "pl-0 pr-6 justify-between"
        )}
      >
        {/* Logo / brand */}
        <Link
          href="/dashboard"
          aria-label="HireSys home"
          className={cn(
            "flex items-center overflow-hidden shrink-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-default)]",
            collapsed ? "justify-center" : "gap-0"
          )}
        >
          {/* Use Ledger logos */}
          <img
            src={collapsed ? "/branding/logo-icon.svg" : "/branding/logo-nav.svg"}
            alt="HireSys Logo"
            className={cn(collapsed ? "h-8 w-auto" : "w-[190px] h-auto object-contain object-left -ml-2")}
          />
        </Link>

        {/* Collapse toggle — only visible when expanded */}
        {!collapsed && (
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Expand toggle — only visible when collapsed */}
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
              "",
              "hover:text-[var(--text-primary)]",
              "transition-colors duration-[var(--ease-base)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              "z-10"
            )}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {/* ——— Main Navigation ——— */}
      <nav
        className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-0.5"
        aria-label="Main navigation"
      >
        {/* Section label */}
        {!collapsed && (
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
          return <NavItem key={item.href} {...item} />;
        })}

        {/* AI Workspace group */}
        <div className="pt-6">
          {!collapsed ? (
            <button
              type="button"
              onClick={() => setAiExpanded(!aiExpanded)}
              aria-expanded={aiExpanded}
              className={cn(
                "flex w-full items-center justify-between",
                "px-3 py-1",
                "text-[11px] font-mono font-medium uppercase tracking-[0.04em]",
                "text-[var(--text-muted)]",
                "hover:text-[var(--text-primary)]",
                "transition-colors duration-[var(--ease-base)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-default)]"
              )}
            >
              AI Workspace
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={cn(
                  "transition-transform duration-150",
                  aiExpanded ? "rotate-180" : ""
                )}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ) : (
            <div className="h-px bg-[var(--border-divider)] mx-2 my-2" />
          )}

          {(aiExpanded || collapsed) && (
            <div className="mt-1 space-y-0.5">
              {aiItems.map((item) => {
                if (selectedOrg?.role === "INTERVIEWER" && item.name === "Resume Intelligence") {
                  return null;
                }
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 h-[44px] px-3 rounded-[var(--radius-default)]",
                      "text-[14px] font-semibold",
                      "transition-colors duration-[var(--ease-base)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset",
                      "overflow-hidden",
                      isActive
                        ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-default)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent",
                      collapsed && "justify-center px-0"
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
                        isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
                        !collapsed && "ml-0.5"
                      )}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="truncate leading-none">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* ——— Bottom: Settings + Profile ——— */}
      <div
        className={cn(
          "shrink-0 border-t border-[var(--border-default)]",
          "px-3 py-3 space-y-0.5"
        )}
      >
        {/* Settings link */}
        <Link
          href="/dashboard/settings"
          title={collapsed ? "Settings" : undefined}
          aria-current={pathname === "/dashboard/settings" ? "page" : undefined}
          className={cn(
            "relative flex items-center gap-3 h-[44px] px-3 rounded-[var(--radius-default)]",
            "text-[14px] font-semibold",
            "transition-colors duration-[var(--ease-base)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset",
            "overflow-hidden",
            pathname === "/dashboard/settings"
              ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-default)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent",
            collapsed && "justify-center px-0"
          )}
        >
          {pathname === "/dashboard/settings" && (
            <span
              className="absolute left-0 top-[8px] bottom-[8px] w-[2px] rounded-r-full bg-[var(--accent)]"
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              "flex items-center justify-center shrink-0 h-4 w-4",
              pathname === "/dashboard/settings" ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
              !collapsed && "ml-0.5"
            )}
          >
            {Icons.settings}
          </span>
          {!collapsed && <span className="truncate leading-none">Settings</span>}
        </Link>

        {/* Profile row: Avatar + Name + Org name + Chevron */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-default)] mt-1",
            "transition-colors duration-[var(--ease-base)]",
            "hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-default)]",
            "cursor-default",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? (user?.name ?? "User") : undefined}
        >
          {/* Avatar — 40px */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-default)] bg-[var(--accent)] text-[13px] font-bold text-white select-none"
            aria-hidden="true"
          >
            {selectedOrg?.name?.charAt(0)?.toUpperCase() ?? "O"}
          </div>

          {/* Name + Org — only when expanded */}
          {!collapsed && (
            <>
              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="truncate text-[14px] font-semibold text-[var(--text-primary)] leading-snug">
                  {user?.name ?? "User"}
                </span>
                <span className="truncate text-[12px] text-[var(--text-muted)] leading-snug mt-0.5">
                  {selectedOrg?.name ?? ""}
                </span>
              </div>
              {/* Chevron */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[var(--text-muted)] shrink-0"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
