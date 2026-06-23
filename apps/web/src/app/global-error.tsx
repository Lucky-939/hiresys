"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Boundary caught an error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-base)]">
          <div className="flex max-w-md flex-col items-center text-center space-y-6 p-8 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] shadow-sm">
            <div className="h-16 w-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center text-[var(--error-text)] text-3xl font-bold">
              !
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-2">Something went wrong!</h2>
              <p className="text-sm text-[var(--text-muted)]">
                We apologize for the inconvenience. A critical error occurred and has been logged.
              </p>
            </div>
            <div className="flex gap-4 w-full">
              <Button onClick={() => window.location.href = '/'} variant="secondary" className="flex-1 justify-center">
                Go Home
              </Button>
              <Button onClick={() => reset()} className="flex-1 justify-center">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
