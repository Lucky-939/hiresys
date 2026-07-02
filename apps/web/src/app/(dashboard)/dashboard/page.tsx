"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { KPICardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardTemplate } from "@/components/layout/templates";
import { api } from "@/lib/api";
import { useOrganizations } from "@/components/ui/OrganizationSelector";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

/* ——— Stage config ——— */
const STAGES = [
  { key: "APPLIED",      label: "Applied",    color: "var(--text-tertiary)" },
  { key: "SCREENING",    label: "Screening",  color: "var(--warning)"       },
  { key: "INTERVIEWING", label: "Interview",  color: "var(--accent)"        },
  { key: "OFFER",        label: "Offer",      color: "var(--success)"       },
  { key: "HIRED",        label: "Hired",      color: "var(--success)"       },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalCandidates: 0,
    interviewsThisWeek: 0,
    hiredThisMonth: 0,
    pendingDecision: 0,
    recentActivity: [],
    pipelineCounts: {}
  });
  const { selectedOrgId, isReady } = useOrganizations();

  useEffect(() => {
    if (!isReady || !selectedOrgId) return;
    setLoading(true);
    api.get("/dashboard/stats", { headers: { "x-organization-id": selectedOrgId } })
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isReady, selectedOrgId]);

  /* ——— Greeting ——— */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  /* ——— Total candidates for pipeline bars ——— */
  const totalPipeline = STAGES.reduce((sum, s) => sum + (stats.pipelineCounts?.[s.key] || 0), 0);

  /* ——— BLOCK 1: Hero / Welcome ——— */
  const hero = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
          {totalPipeline > 0
            ? `${totalPipeline} candidates across the pipeline. Here is your hiring status.`
            : "Your hiring command center. Start by adding candidates."}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/candidates?new=true")}>
          Add Candidate
        </Button>
        <Button size="sm" onClick={() => router.push("/dashboard/interviews")}>
          Create Interview
        </Button>
      </div>
    </div>
  );

  /* ——— BLOCK 2: KPIs — exactly 4 ——— */
  const kpiRow = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
      ) : (
        <>
          <KPICard
            title="Candidates"
            value={stats.totalCandidates}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            emptyMessage="No candidates added yet"
            emptyAction={() => router.push("/dashboard/candidates?new=true")}
            emptyActionLabel="Add first candidate"
          />
          <KPICard
            title="Interviews"
            value={stats.interviewsThisWeek}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            emptyMessage="No interviews scheduled"
            emptyAction={() => router.push("/dashboard/interviews")}
            emptyActionLabel="Create interview"
          />
          <KPICard
            title="Offers Extended"
            value={stats.hiredThisMonth}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
            emptyMessage="No offers extended"
          />
          <KPICard
            title="Pending Decisions"
            value={stats.pendingDecision}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            emptyMessage="No pending decisions"
          />
        </>
      )}
    </div>
  );

  /* ——— BLOCK 3: Pipeline Snapshot (60%) + AI Intelligence (40%) ——— */
  const primaryRow = (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Pipeline Snapshot — 60% (3/5 cols) */}
      <Card className="lg:col-span-3 flex flex-col" padding="default">
        <CardHeader>
          <CardTitle>Hiring Pipeline</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/pipeline")}
            className="text-[var(--text-xs)] font-semibold text-[var(--accent)] hover:bg-[var(--accent-muted)]"
          >
            View board
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 skeleton rounded" />)}
            </div>
          ) : totalPipeline === 0 ? (
            <EmptyState
              compact
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
              title="Pipeline is empty"
              description="Add candidates to start moving them through stages."
              action={
                <Button size="sm" onClick={() => router.push("/dashboard/candidates?new=true")}>
                  Add first candidate
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {STAGES.map(stage => {
                const count = stats.pipelineCounts?.[stage.key] || 0;
                const pct = totalPipeline > 0 ? Math.round((count / totalPipeline) * 100) : 0;
                return (
                  <button
                    key={stage.key}
                    onClick={() => router.push(`/dashboard/pipeline`)}
                    className="flex items-center gap-3 group hover:bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] px-2 py-1.5 -mx-2 transition-colors text-left w-[calc(100%+16px)]"
                  >
                    <span className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)] w-20 shrink-0">{stage.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: stage.color }}
                      />
                    </div>
                    <span className="text-[var(--text-sm)] font-bold text-[var(--text-primary)] w-6 text-right tabular-nums shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Intelligence — 40% (2/5 cols) */}
      <Card className="lg:col-span-2 flex flex-col" padding="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
            <CardTitle>HireSys Intelligence</CardTitle>
          </div>
          <Badge variant="accent" size="sm">AI</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] leading-relaxed">
              {stats.totalCandidates === 0
                ? "Add candidates to receive AI-powered hiring recommendations and alerts."
                : "AI analysis will appear here as candidates progress through the pipeline."}
            </p>
            <div className="flex flex-col gap-2 mt-3">
              {[
                { label: "Resume skill analysis", desc: "Auto-extracted from uploaded resumes" },
                { label: "Interview performance", desc: "Score breakdown after each session" },
                { label: "Hiring recommendations", desc: "AI-ranked candidates by fit" },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)]">
                  <div className="h-4 w-4 rounded bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)]">{item.label}</span>
                    <span className="text-[var(--text-xs)] text-[var(--text-muted)]">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  /* ——— BLOCK 4: Upcoming Interviews (50%) + AI Tools (50%) ——— */
  const secondaryRow = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Upcoming Interviews */}
      <Card className="flex flex-col" padding="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <CardTitle>Upcoming Interviews</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/interviews")}
            className="text-[var(--text-xs)] font-semibold text-[var(--accent)] hover:bg-[var(--accent-muted)]"
          >
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              <div className="h-14 skeleton rounded-[var(--radius-sm)]" />
              <div className="h-14 skeleton rounded-[var(--radius-sm)]" />
            </div>
          ) : (
            <EmptyState
              compact
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
              title="No upcoming interviews"
              description="Schedule your first interview to begin evaluating candidates."
              action={
                <Button size="sm" onClick={() => router.push("/dashboard/interviews")}>
                  Create Interview
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* AI Quick Tools */}
      <Card className="flex flex-col" padding="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </span>
            <CardTitle>AI Recruitment Suite</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {[
              { title: "Resume Intelligence", desc: "Analyze candidates, extract insights", href: "/dashboard/resume", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
              { title: "Interview Copilot", desc: "Generate role-specific questions", href: "/dashboard/question-gen", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> },
              { title: "Coding Rooms", desc: "Live technical interview environment", href: "/dashboard/coding-rooms", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
            ].map(tool => (
              <button
                key={tool.href}
                onClick={() => router.push(tool.href)}
                className="group flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all text-left"
              >
                <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] text-[var(--text-tertiary)] group-hover:bg-[var(--accent)] group-hover:text-white flex items-center justify-center transition-all shrink-0">
                  {tool.icon}
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{tool.title}</span>
                  <span className="text-[var(--text-xs)] text-[var(--text-muted)] truncate">{tool.desc}</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardTemplate
      header={hero}
      kpiRow={kpiRow}
      primaryRow={primaryRow}
      secondaryRow={secondaryRow}
    />
  );
}
