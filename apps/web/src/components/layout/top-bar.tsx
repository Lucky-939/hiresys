"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Breadcrumb, useBreadcrumbs } from "@/components/ui/Breadcrumb";
import { UserMenu } from "@/components/ui/UserMenu";
import { NotificationMenu } from "@/components/ui/NotificationMenu";
import { useOrganizations } from "@/components/ui/OrganizationSelector";
import { useMemo } from "react";

/**
 * HireSys TopBar v2.5 — Phase 2.5 Visual Polish
 *
 * Height  : 64px  (--topbar-height)
 * Surface : --bg-surface (white)
 * Border  : 1px bottom only
 * No shadow. No color accents. Enterprise-first.
 *
 * Layout zones (mathematically aligned):
 *   Left   — Breadcrumb (shrink-0, px-6 from edge)
 *   Center — Search (flex-1, max-w-[420px], perfectly centered)
 *   Right  — Create · Notifications · User (shrink-0, gap-2)
 */

export function TopBar({ setCommandOpen }: { setCommandOpen: (o: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { orgs, selectedOrgId } = useOrganizations();
  const selectedOrg = useMemo(() => orgs.find(o => o.id === selectedOrgId), [orgs, selectedOrgId]);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const breadcrumbItems = useBreadcrumbs(pathname);

  return (
    <header
      className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-6 relative z-30"
      role="banner"
    >

      {/* ——— Left: Breadcrumb ——— */}
      <div className="shrink-0 min-w-0 max-w-[260px]">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* ——— Center: Spacer ——— */}
      <div className="flex-1" />

      {/* ——— Right: Create · Notifications · User ——— */}
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
