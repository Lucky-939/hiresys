"use client";

import React, { useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Breadcrumb, useBreadcrumbs } from "@/components/ui/Breadcrumb";
import { UserMenu } from "@/components/ui/UserMenu";
import { NotificationMenu } from "@/components/ui/NotificationMenu";
import { useOrganizations } from "@/components/ui/OrganizationSelector";

interface TopBarProps {
  setCommandOpen: (o: boolean) => void;
  onToggleMobileMenu?: () => void;
}

export function TopBar({ setCommandOpen, onToggleMobileMenu }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { orgs, selectedOrgId } = useOrganizations();
  const selectedOrg = useMemo(() => orgs.find(o => o.id === selectedOrgId), [orgs, selectedOrgId]);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const breadcrumbItems = useBreadcrumbs(pathname);

  return (
    <header
      className="flex h-[var(--topbar-height)] shrink-0 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 sm:px-6 relative z-30"
      role="banner"
    >
      {/* ——— Left: Mobile Hamburger & Breadcrumb ——— */}
      <div className="flex items-center gap-2.5 min-w-0 max-w-[calc(100vw-140px)] sm:max-w-[340px]">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors shrink-0"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Breadcrumb — collapses smoothly on small phones */}
        <div className="min-w-0 truncate">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

      {/* ——— Center: Spacer ——— */}
      <div className="flex-1" />

      {/* ——— Right: Notifications & User Profile ——— */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Notifications */}
        <NotificationMenu
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        />

        {/* User Menu */}
        <UserMenu
          open={userMenuOpen}
          onOpenChange={setUserMenuOpen}
        />
      </div>
    </header>
  );
}
