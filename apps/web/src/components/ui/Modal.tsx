"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Modal v2.0
 * Radius: 20px (--radius-modal)
 * Shadow: --shadow-md
 * No backdrop blur — semi-transparent dark overlay only.
 * Esc to close. Click-outside to close. Body scroll locked.
 */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "default" | "lg";
}

const sizeMap = {
  sm:      "max-w-sm",
  default: "max-w-[560px]",
  lg:      "max-w-2xl",
};

export function Modal({ open, onClose, title, description, children, footer, size = "default" }: ModalProps) {
  const overlayRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    
    const previousFocus = document.activeElement as HTMLElement;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && overlayRef.current) {
        const focusableElements = overlayRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === overlayRef.current) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    // Auto-focus first element
    setTimeout(() => {
      if (overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 10);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      if (previousFocus) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--bg-overlay)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          "w-full bg-[var(--bg-surface)] border border-[var(--border-default)]",
          "rounded-[var(--radius-modal)] shadow-[var(--shadow-md)]",
          "animate-slide-up flex flex-col max-h-[88vh]",
          sizeMap[size]
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col gap-1">
            <h2
              id="modal-title"
              className="text-[var(--text-xl)] font-semibold text-[var(--text-primary)] leading-tight tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors shrink-0 -mr-1 -mt-1"
            aria-label="Close modal"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
