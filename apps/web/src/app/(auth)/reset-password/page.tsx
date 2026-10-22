"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { getErrorMessage } from "@/lib/error";
import { Logo } from "@/components/ui/Logo";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!token) {
      setError("Invalid or missing reset token.");
      setLoading(false);
      return;
    }

    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
      toast.success("Password has been reset successfully!");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] bg-[var(--bg-surface)] p-8 rounded-[var(--radius-default)] border border-[var(--border-default)]">
      <div className="flex justify-center mb-8">
        <Logo size="lg" />
      </div>

      <h2 className="text-[24px] font-bold text-center text-[var(--text-primary)] tracking-tight mb-2">
        Reset Password
      </h2>
      <p className="text-sm text-center text-[var(--text-muted)] mb-8">
        Enter your new password below.
      </p>

      {error && (
        <div className="p-3 mb-5 rounded-[var(--radius-default)] bg-[var(--danger-bg)]/10 border border-[var(--danger-border)]/50 text-[var(--danger-text)] text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger-text)] shrink-0" />
          {error}
        </div>
      )}

      {success ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-[var(--accent-muted)] text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Your password has been successfully reset.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 px-4 mt-2 text-sm font-bold text-[var(--bg-surface)] bg-[var(--accent)] rounded-[var(--radius-default)] outline-none transition-all hover:bg-[var(--accent-hover)]"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 text-sm font-bold text-[var(--bg-surface)] bg-[var(--accent)] rounded-[var(--radius-default)] outline-none transition-all hover:bg-[var(--accent-hover)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center h-11"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Set New Password"
            )}
          </button>
        </form>
      )}

      {!success && (
        <p className="text-center text-sm font-medium text-[var(--text-muted)] mt-7">
          <Link href="/login" className="text-[var(--accent)] hover:underline underline-offset-2">
            Cancel
          </Link>
        </p>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
