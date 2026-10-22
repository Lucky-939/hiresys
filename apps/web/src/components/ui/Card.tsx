import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Card System v2.0
 * Radius: 4px (--radius-default)
 * Border: 1px --border-default
 * Shadow: None
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
  shadow = true,
  children,
  ...props
}: CardProps) {
  const paddingClasses = {
    none:    "",
    compact: "p-4",
    default: "p-6",
    large:   "p-8",
  };
  return (
    <div
      className={cn(
        "rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)]",
        paddingClasses[padding],
        interactive && [
          "cursor-pointer transition-colors duration-[var(--ease-base)]",
          "hover:border-[var(--border-default)]",
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
        "text-[14px] font-semibold text-[var(--text-primary)] leading-snug tracking-tight",
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
      className={cn("text-[12px] text-[var(--text-secondary)] leading-relaxed mt-0.5", className)}
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
        "flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-divider)] mt-4",
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
  return <div className={cn("h-px bg-[var(--border-divider)] -mx-6 my-4", className)} />;
}
