"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { getErrorMessage } from "@/lib/error";
import { Logo } from "@/components/ui/Logo";
import { toast } from "sonner";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const emailParam = searchParams.get("email") || "";
  const isInvite = Boolean(redirectParam && redirectParam.includes("/invite/"));

  const [step, setStep] = useState<"form" | "otp">("form");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: emailParam,
    organizationName: "",
    password: "",
  });

  useEffect(() => {
    if (emailParam) {
      setForm((prev) => ({ ...prev, email: emailParam }));
    }
  }, [emailParam]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: any = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      };
      if (!isInvite && form.organizationName.trim()) {
        payload.organizationName = form.organizationName.trim();
      }

      const res = await api.post("/auth/register", payload);
      setUserId(res.data.userId);
      setStep("otp");
      toast.success(res.data.message);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/verify-email", { userId, code: otp });
      toast.success(res.data.message || "Email verified successfully.");
      const emailQuery = form.email ? `&email=${encodeURIComponent(form.email)}` : "";
      const target = redirectParam
        ? `/login?redirect=${encodeURIComponent(redirectParam)}${emailQuery}`
        : `/login?email=${encodeURIComponent(form.email)}`;
      router.push(target);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Left panel — Brand Hero */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 xl:p-14 bg-[var(--bg-surface)] relative overflow-hidden border-r border-[var(--border-default)]">

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        {/* Logo */}
        <Logo size="lg" className="z-10 shrink-0" />

        {/* Center hero content */}
        <div className="z-10 flex-1 flex flex-col justify-center max-w-lg py-8">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-4">
            AI-Powered Hiring Platform
          </p>

          <h1 className="text-[2.5rem] xl:text-[2.75rem] font-extrabold text-[var(--text-primary)] leading-[1.1] tracking-tight mb-5">
            Build your team.<br />
            <span className="text-[var(--text-muted)]">Scale with AI.</span>
          </h1>

          <p className="text-[15px] text-[var(--text-muted)] leading-relaxed mb-8 max-w-sm font-medium">
            One workspace for applicant tracking, live coding interviews, AI evaluations, and data-driven hiring decisions.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3">
            {[
              { label: "AI Resume & Code Review", desc: "Gemini-powered analysis" },
              { label: "Real-Time Interview Rooms", desc: "Live coding with presence sync" },
              { label: "Multi-Tenant Workspaces", desc: "Org-level isolation & RBAC" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                <span className="text-sm font-medium text-[var(--text-primary)]">{f.label}</span>
                <span className="text-xs text-[var(--text-muted)] hidden xl:inline">— {f.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust strip */}
        <div className="z-10 flex items-center gap-6 text-[11px] font-medium text-[var(--text-subtle)] shrink-0">
          <span>PostgreSQL</span>
          <span className="w-px h-3 bg-[var(--border-default)]" />
          <span>Redis</span>
          <span className="w-px h-3 bg-[var(--border-default)]" />
          <span>Socket.io</span>
          <span className="w-px h-3 bg-[var(--border-default)]" />
          <span>Docker</span>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 xl:p-16 bg-[var(--bg-base)] overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <Logo size="lg" className="mb-10 lg:hidden" />

          <h2 className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight mb-1.5">
            {step === "form" ? (isInvite ? "Join your team" : "Create account") : "Verify Email"}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-7">
            {step === "form"
              ? (isInvite ? "Set your name and password to accept your invitation." : "Set up your workspace and start hiring.")
              : `Enter the 6-digit code sent to ${form.email}`}
          </p>

          {error && (
            <div className="p-3 mb-5 rounded-[var(--radius-default)] bg-[var(--danger-bg)]/10 border border-[var(--danger-border)]/50 text-[var(--danger-text)] text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger-text)] shrink-0" />
              {error}
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Smith"
                  autoComplete="name"
                  className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              {!isInvite && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                    Company / Organization name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.organizationName}
                    onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                    placeholder="e.g. Acme Corp or TechNova Solutions"
                    className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                    Your team workspace for jobs, candidates, and interviews.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 mt-2 text-sm font-bold text-[var(--bg-surface)] bg-[var(--accent)] rounded-[var(--radius-default)] outline-none transition-all hover:bg-[#0a4d3c] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center h-11"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  isInvite ? "Create Account & Continue →" : "Create account →"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 text-2xl tracking-[0.5em] text-center bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-2.5 px-4 mt-1 text-sm font-bold text-[var(--bg-surface)] bg-[var(--accent)] rounded-[var(--radius-default)] outline-none transition-all hover:bg-[#0a4d3c] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center h-11"
              >
                {loading ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Verify & Continue →"
                )}
              </button>
            </form>
          )}

          {step === "form" && (
            <p className="text-center text-sm font-medium text-[var(--text-muted)] mt-7">
              Already have an account?{" "}
              <Link
                href={
                  redirectParam
                    ? `/login?redirect=${encodeURIComponent(redirectParam)}${form.email ? `&email=${encodeURIComponent(form.email)}` : ""}`
                    : (form.email ? `/login?email=${encodeURIComponent(form.email)}` : "/login")
                }
                className="text-[var(--accent)] hover:underline underline-offset-2"
              >
                Sign in →
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)]">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
