"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Input System v2.0
 * Input/Select height: 44px (--input-height)
 * Radius: 12px (--radius-input)
 * No inset shadows. Focus: accent border + 3px ring.
 */

/* ——— Input ——— */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, success, leading, trailing, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const hasError = Boolean(error);
    const hasSuccess = Boolean(success) && !hasError;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)] leading-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leading && (
            <span className="absolute left-3.5 flex items-center text-[var(--text-muted)] pointer-events-none">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-[var(--radius-input)] border bg-[var(--bg-surface)]",
              "h-[var(--input-height)] px-3.5",
              "text-[var(--text-base)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
              "transition-colors duration-[var(--ease-base)]",
              "focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-[0.15]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--bg-secondary)]",
              hasError
                ? "border-[var(--danger)] focus:ring-[var(--danger)] focus:border-[var(--danger)]"
                : hasSuccess
                  ? "border-[var(--success)] focus:ring-[var(--success)] focus:border-[var(--success)]"
                  : "border-[var(--border-default)] hover:border-[var(--border-strong)]",
              leading  ? "pl-10" : "",
              trailing ? "pr-10" : "",
              className
            )}
            {...props}
          />
          {trailing && (
            <span className="absolute right-3.5 flex items-center text-[var(--text-muted)] pointer-events-none">
              {trailing}
            </span>
          )}
        </div>
        {(hint || error || success) && (
          <p className={cn(
            "text-[var(--text-xs)] leading-tight",
            hasError   ? "text-[var(--danger-text)]"
            : hasSuccess ? "text-[var(--success-text)]"
            : "text-[var(--text-muted)]"
          )}>
            {error || success || hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

/* ——— Textarea ——— */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)] leading-none">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full min-h-[96px] rounded-[var(--radius-input)] border bg-[var(--bg-surface)] px-3.5 py-3",
            "text-[var(--text-base)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
            "transition-colors duration-[var(--ease-base)] resize-y",
            "focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-[0.15]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-[var(--danger)] focus:ring-[var(--danger)] focus:border-[var(--danger)]"
              : "border-[var(--border-default)] hover:border-[var(--border-strong)]",
            className
          )}
          {...props}
        />
        {(hint || error) && (
          <p className={cn("text-[var(--text-xs)]", error ? "text-[var(--danger-text)]" : "text-[var(--text-muted)]")}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

/* ——— Select ——— */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, id, children, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)] leading-none">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "h-[var(--input-height)] w-full appearance-none rounded-[var(--radius-input)] border bg-[var(--bg-surface)] px-3.5 pr-9",
              "text-[var(--text-base)] text-[var(--text-primary)]",
              "transition-colors duration-[var(--ease-base)] cursor-pointer",
              "focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-[0.15]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-[var(--danger)]"
                : "border-[var(--border-default)] hover:border-[var(--border-strong)]",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>
        {(hint || error) && (
          <p className={cn("text-[var(--text-xs)]", error ? "text-[var(--danger-text)]" : "text-[var(--text-muted)]")}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

/* ——— Checkbox ——— */
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const inputId = id || React.useId();
  return (
    <label htmlFor={inputId} className="flex items-center gap-2.5 cursor-pointer group select-none">
      <input
        type="checkbox"
        id={inputId}
        className={cn(
          "h-4 w-4 rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-surface)]",
          "accent-[var(--accent)] cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
      {label && (
        <span className="text-[var(--text-base)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          {label}
        </span>
      )}
    </label>
  );
}
