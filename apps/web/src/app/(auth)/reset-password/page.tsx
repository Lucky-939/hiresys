"use client";

import { useState, Suspense } from "react";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getErrorMessage } from "@/lib/error";
import { Logo } from "@/components/ui/Logo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        token,
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[380px]">
      <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
        Create New Password
      </h2>
      <p className="text-base text-[var(--text-tertiary)] mb-8">
        Your new password must be different from previous used passwords.
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
          Password reset successfully. Redirecting to login...
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
              New password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--border-default)] rounded-lg outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
              Confirm password
            </label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--border-default)] rounded-lg outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.password || !form.confirmPassword || !token}
            className="w-full py-2.5 px-4 mt-2 text-sm font-bold text-white bg-[var(--accent)] rounded-lg outline-none transition-all hover:bg-[var(--accent-hover)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center h-11"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Reset Password →"
            )}
          </button>
        </form>
      )}

      <p className="text-center text-sm font-medium text-[var(--text-tertiary)] mt-8">
        Back to{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline underline-offset-2">
          Login
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex bg-white text-[var(--text-primary)]">
      {/* Left panel — Brand */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-gradient-to-b from-[#2B5797] to-[#1E3F6F] relative overflow-hidden">
        <Logo size="lg" className="text-white [&>span]:text-white z-10" />

        {/* Main content */}
        <div className="max-w-md z-10">
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight mb-4">
            Secure your account
          </h1>
          <p className="text-base text-white/80 leading-relaxed mb-12">
            Create a strong, unique password to keep your hiring workspace safe and secure.
          </p>
        </div>

        {/* Decorative background element */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -left-16 w-64 h-64 bg-[#4A7ACC]/20 rounded-full blur-3xl" />
      </div>

      {/* Right panel — Form */}
      <div className="w-full lg:w-[500px] xl:w-[600px] shrink-0 flex items-center justify-center p-8 sm:p-12 bg-white">
        <Suspense fallback={<div>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
