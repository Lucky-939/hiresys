"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import { getErrorMessage } from "@/lib/error";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
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
    <div className="min-h-screen flex bg-white text-[var(--text-primary)]">
      {/* Left panel — Brand */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-gradient-to-b from-[#2B5797] to-[#1E3F6F] relative overflow-hidden">
        {/* Logo */}
        <Logo size="lg" className="text-white [&>span]:text-white" />


        {/* Main content */}
        <div className="max-w-md z-10">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-white/60 mb-6">
            Trusted by 2,400+ recruiters
          </p>

          <blockquote className="text-2xl font-light italic text-white leading-relaxed mb-8 tracking-tight">
            &ldquo;The only hiring platform that helps us truly understand candidates — not just track them.&rdquo;
          </blockquote>

          <div className="flex items-center gap-4 mb-14">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-bold text-white shadow-sm">
              RP
            </div>
            <div>
              <p className="text-base font-bold text-white m-0">Riya Patel</p>
              <p className="text-sm text-white/70 m-0">Head of Talent, Zepto</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-bold text-white m-0 leading-none mb-2">10k+</p>
              <p className="text-xs text-white/60 m-0">Interviews conducted</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white m-0 leading-none mb-2">94%</p>
              <p className="text-xs text-white/60 m-0">Hire accuracy</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white m-0 leading-none mb-2">3×</p>
              <p className="text-xs text-white/60 m-0">Faster time-to-offer</p>
            </div>
          </div>
        </div>

        {/* Bottom trust badges */}
        <div className="flex gap-8 text-xs font-semibold text-white/50 z-10">
          <span>SOC 2 Type II</span>
          <span>256-bit SSL</span>
          <span>GDPR Ready</span>
        </div>
        
        {/* Decorative background element */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -left-16 w-64 h-64 bg-[#4A7ACC]/20 rounded-full blur-3xl" />
      </div>

      {/* Right panel — Form */}
      <div className="w-full lg:w-[500px] xl:w-[600px] shrink-0 flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-[380px]">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
            Welcome back
          </h2>
          <p className="text-base text-[var(--text-tertiary)] mb-8">
            Sign in to your hiring workspace
          </p>

          <button
            type="button"
            className="w-full py-2.5 px-4 text-sm font-medium text-[var(--text-primary)] bg-white border border-[var(--border-default)] rounded-lg flex items-center justify-center gap-3 transition-colors hover:bg-[var(--bg-elevated)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 outline-none"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-[var(--border-default)]" />
            <span className="text-xs font-semibold text-[var(--text-disabled)] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[var(--border-default)]" />
          </div>

          {error && (
            <div className="p-3 mb-6 rounded-lg bg-[var(--danger-bg)]/10 border border-[var(--danger-border)]/50 text-[var(--danger-text)] text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger-text)] shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="flex justify-between text-sm font-semibold text-[var(--text-secondary)] mb-2">
                Work email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--border-default)] rounded-lg outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-semibold text-[var(--text-secondary)] mb-2">
                Password
                <Link href="/forgot-password" className="text-xs font-medium text-[var(--accent)] hover:underline underline-offset-2">
                  Forgot password?
                </Link>
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--border-default)] rounded-lg outline-none transition-all placeholder:text-[var(--text-disabled)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
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
              className="w-full py-2.5 px-4 mt-2 text-sm font-bold text-white bg-[var(--accent)] rounded-lg outline-none transition-all hover:bg-[var(--accent-hover)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center h-11"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          <p className="text-center text-sm font-medium text-[var(--text-tertiary)] mt-8">
            Don't have an account?{" "}
            <Link href="/register" className="text-[var(--accent)] hover:underline underline-offset-2">
              Create one free! →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
