import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Card System v2.0
 * Radius: 16px (--radius-card)
 * Border: 1px --border-default
 * Shadow: --shadow-sm only
 * Background: --bg-surface (white) only — no colored backgrounds
 */

/* ——— Base Card ——— */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "compact" | "default" | "large";
  interactive?: boolean;
  shadow?: boolean;
}

export function Card({
  className,
  padding = "default",
  interactive = false,
  shadow = false,
  children,
  ...props
}: CardProps) {
  const paddingClasses = {
    none:    "",
    compact: "p-4",
    default: "p-5",
    large:   "p-6",
  };
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-surface)]",
        shadow && "shadow-[var(--shadow-sm)]",
        paddingClasses[padding],
        interactive && [
          "cursor-pointer transition-colors duration-[var(--ease-base)]",
          "hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]",
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ——— Card sub-components ——— */
export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-start justify-between gap-4 pb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[var(--text-base)] font-semibold text-[var(--text-primary)] leading-snug tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed mt-0.5", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)] mt-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ——— Inset divider ——— */
export function CardDivider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-[var(--border-subtle)] -mx-5 my-4", className)} />;
}
