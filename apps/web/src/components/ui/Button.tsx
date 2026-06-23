import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "sm" | "default" | "md" | "lg" | "icon";
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, icon, children, disabled, ...props }, ref) => {
    
    // Tailwind classes for variants
    const variantClasses = {
      default: "bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-hover)] dark:text-[var(--accent-foreground)]",
      primary: "bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-hover)] dark:text-[var(--accent-foreground)]",
      secondary: "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--border-default)]",
      outline: "border border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]",
      ghost: "bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]",
      destructive: "bg-[var(--danger)] text-white hover:opacity-90 shadow-sm dark:text-[var(--accent-foreground)]",
    };

    const sizeClasses = {
      default: "h-9 px-4 py-2",
      md: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!loading && icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
