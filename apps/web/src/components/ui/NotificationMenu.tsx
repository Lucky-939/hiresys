"use client";

import React, { useRef, useEffect } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

/**
 * HireSys NotificationMenu v2.0
 * Uses real notification data from useNotifications hook.
 * No fabricated data. Empty state allowed.
 */

interface NotificationMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationMenu({ open, onOpenChange }: NotificationMenuProps) {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
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

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    onOpenChange(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        id="notification-menu-trigger"
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-default)]",
          "text-[var(--text-muted)] transition-colors duration-[var(--ease-base)]",
          "hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
          open && "bg-[var(--bg-base)] text-[var(--text-primary)]"
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Unread dot — only when there are real unread items */}
        {unreadCount > 0 && (
          <span
            className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-[var(--danger)] border-2 border-[var(--bg-surface)]"
            aria-label={`${unreadCount} unread`}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "absolute right-0 mt-2 z-50",
            "w-[340px]",
            "rounded-[var(--radius-default)]",
            "border border-[var(--border-default)]",
            "bg-[var(--bg-surface)]",
            "animate-slide-up",
            "overflow-hidden"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-divider)]">
            <span className="text-[14px] font-semibold text-[var(--text-primary)]">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accentHover)] transition-colors focus-visible:outline-none focus-visible:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[var(--text-muted)]"
                  aria-hidden="true"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p className="text-[13px] text-[var(--text-muted)] text-center">
                  No notifications
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 border-b border-[var(--border-divider)] last:border-b-0",
                    "transition-colors duration-[var(--ease-base)]",
                    "hover:bg-[var(--bg-base)]",
                    !n.isRead && "bg-[var(--accent-muted)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] leading-snug">
                      {n.title}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0 tabular-nums">
                      {new Date(n.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {n.desc && (
                    <p className="mt-0.5 text-[12px] text-[var(--text-secondary)] leading-relaxed">
                      {n.desc}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
