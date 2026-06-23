"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { getErrorMessage } from "@/lib/error";
import { Logo } from "@/components/ui/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white text-[var(--text-primary)]">
      {/* Left panel — Brand */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-gradient-to-b from-[#2B5797] to-[#1E3F6F] relative overflow-hidden">
        <Logo size="lg" className="text-white [&>span]:text-white z-10" />

        {/* Main content */}
        <div className="max-w-md z-10">
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight mb-4">
            Forgot your password?
          </h1>
          <p className="text-base text-white/80 leading-relaxed mb-12">
            No worries. Enter your email address and we'll send you a link to reset it safely.
          </p>
        </div>

        {/* Decorative background element */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -left-16 w-64 h-64 bg-[#4A7ACC]/20 rounded-full blur-3xl" />
      </div>

      {/* Right panel — Form */}
      <div className="w-full lg:w-[500px] xl:w-[600px] shrink-0 flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-[380px]">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
            Reset Password
          </h2>
          <p className="text-base text-[var(--text-tertiary)] mb-8">
            Enter the email address associated with your account.
          </p>

          {error && (
            <div className="p-3 mb-6 rounded-lg bg-[var(--danger-bg)]/10 border border-[var(--danger-border)]/50 text-[var(--danger-text)] text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger-text)] shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 mb-6 rounded-lg bg-[#10B981]/10 border border-[#10B981]/50 text-[#059669] text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] shrink-0" />
              If an account exists, a reset link has been sent.
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  Work email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--border-default)] rounded-lg outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 px-4 mt-2 text-sm font-bold text-white bg-[var(--accent)] rounded-lg outline-none transition-all hover:bg-[var(--accent-hover)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center h-11"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Send Reset Link →"
                )}
              </button>
            </form>
          )}

          <p className="text-center text-sm font-medium text-[var(--text-tertiary)] mt-8">
            Remember your password?{" "}
            <Link href="/login" className="text-[var(--accent)] hover:underline underline-offset-2">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
