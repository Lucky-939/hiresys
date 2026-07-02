"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import { getErrorMessage } from "@/lib/error";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      setAuth(data.token, data.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white text-[var(--text-primary)]">
      {/* Left panel — Brand Hero */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 xl:p-14 bg-[#F8FAFC] relative overflow-hidden border-r border-[var(--border-default)]">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0 opacity-40 mix-blend-multiply">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-200/50 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] bg-indigo-200/40 rounded-full blur-[100px]" />
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-sky-200/50 rounded-full blur-[80px]" />
        </div>

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
            Hire smarter.<br />
            <span className="text-[var(--text-muted)]">Ship faster.</span>
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
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 xl:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <Logo size="lg" className="mb-10 lg:hidden" />

          <h2 className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight mb-1.5">
            Welcome back
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-7">
            Sign in to your hiring workspace
          </p>



          {error && (
            <div className="p-3 mb-5 rounded-lg bg-[var(--danger-bg)]/10 border border-[var(--danger-border)]/50 text-[var(--danger-text)] text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger-text)] shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="flex justify-between text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                Work email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[var(--border-default)] rounded-lg outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                Password
                <Link href="/forgot-password" className="text-xs font-medium text-[var(--accent)] hover:underline underline-offset-2">
                  Forgot?
                </Link>
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[var(--border-default)] rounded-lg outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm font-medium text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-strong)] text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)] cursor-pointer"
              />
              Remember me for 30 days
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 mt-1 text-sm font-bold text-white bg-[var(--accent)] rounded-lg outline-none transition-all hover:bg-[var(--accent-hover)] hover:shadow-md focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center h-11"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          <p className="text-center text-sm font-medium text-[var(--text-tertiary)] mt-7">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[var(--accent)] hover:underline underline-offset-2">
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

