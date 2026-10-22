"use client";

import React, { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

/**
 * HireSys UserMenu v2.0
 * Items: Organization · Settings · Sign Out
 * No fake data. Avatar derived from real user name initial.
 */

interface UserMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserMenu({ open, onOpenChange }: UserMenuProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, onOpenChange]);

  const handleNavigate = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "U";

  const menuItemCls = cn(
    "flex w-full items-center gap-2.5",
    "rounded-[var(--radius-default)]",
    "px-2.5 py-2",
    "text-[13px] text-[var(--text-primary)]",
    "text-left",
    "transition-colors duration-[var(--ease-base)]",
    "hover:bg-[var(--bg-base)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
  );

  return (
    <div className="relative" ref={ref}>
      {/* Trigger — avatar initial */}
      <button
        id="user-menu-trigger"
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          "bg-[var(--accent)] text-white",
          "text-[12px] font-semibold select-none",
          "transition-colors duration-[var(--ease-base)]",
          "hover:bg-[var(--accent-hover)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        )}
      >
        {initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          aria-label="User options"
          className={cn(
            "absolute right-0 mt-2 z-50",
            "w-[220px]",
            "rounded-[var(--radius-default)]",
            "border border-[var(--border-default)]",
            "bg-[var(--bg-surface)]",
            "animate-slide-up",
            "overflow-hidden"
          )}
        >
          {/* Identity block */}
          <div className="px-3 py-3 border-b border-[var(--border-divider)]">
            <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
              {user?.name ?? "User"}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] truncate mt-0.5">
              {user?.email ?? ""}
            </p>
          </div>

          {/* Actions */}
          <div className="p-1.5">
            <button
              role="menuitem"
              type="button"
              onClick={() => handleNavigate("/dashboard/organization")}
              className={menuItemCls}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--text-muted)] shrink-0"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="5" height="7" rx="0.5" />
                <rect x="9" y="5" width="5" height="9" rx="0.5" />
                <path d="M4 5h1M4 7h1M11 8h1M11 10h1M11 12h1" />
                <path d="M2 9h5v5H2z" />
              </svg>
              Organization
            </button>

            <button
              role="menuitem"
              type="button"
              onClick={() => handleNavigate("/dashboard/settings")}
              className={menuItemCls}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--text-muted)] shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 4.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 .6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </button>
          </div>

          {/* Sign out */}
          <div className="p-1.5 border-t border-[var(--border-divider)]">
            <button
              role="menuitem"
              type="button"
              onClick={handleLogout}
              className={cn(
                "flex w-full items-center gap-2.5",
                "rounded-[var(--radius-default)]",
                "px-2.5 py-2",
                "text-[13px] font-medium text-[var(--danger)]",
                "text-left",
                "transition-colors duration-[var(--ease-base)]",
                "hover:bg-[var(--bg-base)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-inset"
              )}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
