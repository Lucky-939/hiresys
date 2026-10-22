"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

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
      <div className="flex max-w-md flex-col items-center text-center space-y-6 p-8 bg-[var(--bg-surface)] rounded-[var(--radius-default)] border border-[var(--border-default)] shadow-none">
        <div className="relative h-16 w-16">
          <Image
            src="/branding/logo-icon.svg"
            alt="HireSys Logo"
            fill
            className="object-contain"
          />
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
