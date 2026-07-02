"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useAuthStore } from "@/store/auth.store";
import { useNotifications } from "@/hooks/use-notifications";

/**
 * HireSys TopBar v2.0
 * Height: 60px (--topbar-height)
 * Background: --bg-surface (white)
 * Border: 1px --border-default bottom
 * No colorful elements. Enterprise-first.
 */
export function TopBar({ setCommandOpen }: { setCommandOpen: (o: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setNotificationsOpen(false);
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) setCreateMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); router.push("/login"); };
  const handleMarkAllRead = async () => { await markAllAsRead(); setNotificationsOpen(false); };

  /* Breadcrumbs */
  const paths = pathname.split("/").filter(Boolean);
  const breadcrumbs = paths.map((path, idx) => ({
    name: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " "),
    isLast: idx === paths.length - 1,
  }));

  /* Dropdown shared classes */
  const dropdownCls = "absolute right-0 mt-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)] animate-slide-up z-50";
  const menuItemCls = "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[var(--text-sm)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors text-left";

  return (
    <header className="flex h-[60px] shrink-0 items-center border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-6 relative z-30 gap-4">

      {/* Left: Breadcrumbs */}
      <div className="flex items-center text-[var(--text-sm)] shrink-0 gap-1.5">
        {breadcrumbs.map((bc, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--border-strong)]">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
            <span className={bc.isLast
              ? "font-medium text-[var(--text-primary)]"
              : "text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
            }>
              {bc.name}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Center: Search */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={() => setCommandOpen(true)}
          className="flex h-9 w-full max-w-[400px] items-center gap-2.5 rounded-[var(--radius-btn)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-[var(--text-sm)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <span className="flex shrink-0 text-[var(--text-muted)]">{Icons.search}</span>
          <span className="flex-1 text-left truncate">Search candidates, interviews...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Quick Create */}
        <div className="relative" ref={createMenuRef}>
          <button
            onClick={() => setCreateMenuOpen(!createMenuOpen)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-btn)] bg-[var(--accent)] text-[var(--text-btn)] font-semibold text-white hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create
          </button>
          {createMenuOpen && (
            <div className={`${dropdownCls} w-52 p-1.5`}>
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                New
              </div>
              <button
                onClick={() => { router.push("/dashboard/candidates?new=true"); setCreateMenuOpen(false); }}
                className={menuItemCls}
              >
                <span className="flex items-center justify-center h-5 w-5 rounded-[var(--radius-xs)] bg-[var(--accent-muted)] text-[var(--accent)]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </span>
                Candidate
              </button>
              <button
                onClick={() => { router.push("/dashboard/interviews"); setCreateMenuOpen(false); }}
                className={menuItemCls}
              >
                <span className="flex items-center justify-center h-5 w-5 rounded-[var(--radius-xs)] bg-[var(--accent-muted)] text-[var(--accent)]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
                Interview
              </button>
              <div className="h-px bg-[var(--border-subtle)] my-1 mx-1.5" />
              <button
                onClick={() => { router.push("/dashboard/resume"); setCreateMenuOpen(false); }}
                className={menuItemCls}
              >
                <span className="flex items-center justify-center h-5 w-5 rounded-[var(--radius-xs)] bg-[var(--accent-muted)] text-[var(--accent)]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </span>
                Upload Resume
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Toggle notifications"
            aria-expanded={notificationsOpen}
            className={`relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-btn)] transition-colors ${notificationsOpen ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--danger)] border border-[var(--bg-surface)]" />
            )}
          </button>

          {notificationsOpen && (
            <div className={`${dropdownCls} w-80`}>
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
                <span className="text-[var(--text-base)] font-semibold text-[var(--text-primary)]">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[var(--text-xs)] text-[var(--accent)] font-medium hover:text-[var(--accent-hover)] hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[var(--text-sm)] text-[var(--text-muted)]">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors ${!n.isRead ? "bg-[var(--accent-muted)]" : ""}`}>
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)]">{n.title}</span>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[var(--text-xs)] text-[var(--text-secondary)]">{n.desc}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white font-semibold text-[12px] hover:bg-[var(--accent-hover)] transition-colors select-none"
          >
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </button>

          {userMenuOpen && (
            <div className={`${dropdownCls} w-52`}>
              <div className="px-3 py-3 border-b border-[var(--border-subtle)]">
                <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{user?.name || "User"}</p>
                <p className="text-[var(--text-xs)] text-[var(--text-muted)] truncate">{user?.email}</p>
              </div>
              <div className="p-1.5">
                <button onClick={() => { router.push("/dashboard/organization"); setUserMenuOpen(false); }} className={menuItemCls}>
                  <span className="text-[var(--text-muted)]">{Icons.organization}</span>
                  Organization
                </button>
                <button onClick={() => { router.push("/dashboard/settings"); setUserMenuOpen(false); }} className={menuItemCls}>
                  <span className="text-[var(--text-muted)]">{Icons.settings}</span>
                  Settings
                </button>
              </div>
              <div className="p-1.5 border-t border-[var(--border-subtle)]">
                <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[var(--text-sm)] font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors text-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
