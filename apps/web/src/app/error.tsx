"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center">
      <div className="flex max-w-md flex-col items-center text-center space-y-6 p-8 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] shadow-sm">
        <div className="h-16 w-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center text-[var(--error-text)] text-3xl font-bold">
          !
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-2">Unexpected Error</h2>
          <p className="text-sm text-[var(--text-muted)]">
            An unexpected error has occurred on this page. Our team has been notified.
          </p>
        </div>
        <Button onClick={() => reset()} className="w-full justify-center">
          Try Again
        </Button>
      </div>
    </div>
  );
}
