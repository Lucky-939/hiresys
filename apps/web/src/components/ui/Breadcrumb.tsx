import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * HireSys Breadcrumb v2.0
 * Enterprise style — chevron separators, clickable ancestors.
 * Ancestors: --text-muted with hover underline, current: --text-primary / font-semibold.
 */

export interface BreadcrumbItem {
  name: string;
  href?: string;
  isLast?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5", className)}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-[var(--border-strong)] shrink-0"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          {item.isLast || !item.href ? (
            <span
              className={cn(
                "leading-none select-none whitespace-nowrap",
                item.isLast
                  ? "text-[13px] font-semibold text-[var(--text-primary)]"
                  : "text-[12px] font-normal text-[var(--text-muted)] cursor-default"
              )}
              aria-current={item.isLast ? "page" : undefined}
            >
              {item.name}
            </span>
          ) : (
            <Link
              href={item.href}
              className="text-[12px] font-normal text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline cursor-pointer leading-none select-none whitespace-nowrap transition-colors"
            >
              {item.name}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/**
 * useBreadcrumbs — derives breadcrumb items from Next.js pathname.
 * Strips route group segments like (dashboard) and generates valid href links.
 */
export function useBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.startsWith("(") && !s.endsWith(")"));

  let accumulatedPath = "";
  return segments.map((segment, idx) => {
    accumulatedPath += `/${segment}`;
    const isLast = idx === segments.length - 1;
    return {
      name:
        segment.charAt(0).toUpperCase() +
        segment.slice(1).replace(/-/g, " "),
      href: isLast ? undefined : accumulatedPath,
      isLast,
    };
  });
}