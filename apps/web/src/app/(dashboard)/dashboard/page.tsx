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
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardTemplate } from "@/components/layout/templates";
import { api } from "@/lib/api";
import { useOrganizations } from "@/components/ui/OrganizationSelector";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";



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
  const [stages, setStages] = useState<any[]>([]);
  const { selectedOrgId, isReady, orgs } = useOrganizations();
  const selectedOrg = orgs.find(o => o.id === selectedOrgId);

  useEffect(() => {
    if (isReady && selectedOrg?.role === "INTERVIEWER") {
      router.replace("/dashboard/interviews");
    }
  }, [isReady, selectedOrg, router]);

  useEffect(() => {
    if (!isReady) return;
    if (!selectedOrgId || selectedOrg?.role === "INTERVIEWER") {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get("/dashboard/stats", { headers: { "x-organization-id": selectedOrgId } })
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    api.get(`/organizations/${selectedOrgId}/stages`)
      .then(res => setStages(res.data.data))
      .catch(() => {});
  }, [isReady, selectedOrgId, selectedOrg?.role]);

  if (isReady && selectedOrg?.role === "INTERVIEWER") return null;

  /* ——— Greeting ——— */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  /* ——— Total candidates for pipeline bars ——— */
  const totalPipeline = stages.reduce((sum, s) => sum + (stats.pipelineCounts?.[s.id] || 0), 0);

  /* ——— BLOCK 1: Hero / Welcome ——— */
  const hero = (
    <PageHeader
      className="mb-0 mt-2"
      title={`${greeting}, ${firstName}`}
      description={
        totalPipeline > 0
          ? `${totalPipeline} candidates across the pipeline. Here is your hiring status.`
          : "Your hiring command center. Start by adding candidates."
      }
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard/candidates?new=true")}>
            Add Candidate
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard/interviews")}>
            Create Interview
          </Button>
        </>
      }
    />
  );

  /* ——— BLOCK 2: KPIs — exactly 4 ——— */
  const kpiRow = (
    <div className="flex flex-col lg:flex-row border border-[var(--border-default)] rounded-[var(--radius-default)] bg-[var(--bg-surface)] overflow-hidden">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 border-b lg:border-b-0 lg:border-r border-[var(--border-divider)] last:border-0">
            <KPICardSkeleton />
          </div>
        ))
      ) : (
        <>
          <KPICard
            className="flex-1 border-b lg:border-b-0 lg:border-r border-[var(--border-divider)] last:border-0"
            title="Candidates"
            value={stats.totalCandidates}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            emptyMessage="No candidates added yet"
          />
          <KPICard
            className="flex-1 border-b lg:border-b-0 lg:border-r border-[var(--border-divider)] last:border-0"
            title="Interviews"
            value={stats.interviewsThisWeek}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            emptyMessage="No interviews scheduled"
          />
          <KPICard
            className="flex-1 border-b lg:border-b-0 lg:border-r border-[var(--border-divider)] last:border-0"
            title="Offers Extended"
            value={stats.hiredThisMonth}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
            emptyMessage="No offers extended"
          />
          <KPICard
            className="flex-1 border-b lg:border-b-0 lg:border-r border-[var(--border-divider)] last:border-0"
            title="Pending Decisions"
            value={stats.pendingDecision}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
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
          <CardTitle className="text-[20px]">Hiring Pipeline</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/pipeline")}
            className="text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-muted)] flex items-center gap-1"
          >
            View board
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
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
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
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
              {stages.map(stage => {
                const count = stats.pipelineCounts?.[stage.id] || 0;
                const pct = totalPipeline > 0 ? Math.round((count / totalPipeline) * 100) : 0;
                return (
                  <button
                    key={stage.id}
                    onClick={() => router.push(`/dashboard/pipeline`)}
                    className="flex items-center gap-3 group hover:bg-[var(--bg-elevated)] rounded-[var(--radius-default)] px-2 py-1.5 -mx-2 transition-colors text-left w-[calc(100%+16px)]"
                  >
                    <span className="text-sm font-medium text-[var(--text-secondary)] w-20 shrink-0">{stage.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: stage.color }}
                      />
                    </div>
                    <span className="text-sm font-mono font-bold text-[var(--text-primary)] w-6 text-right tabular-nums shrink-0">{count}</span>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </span>
            <CardTitle className="text-[20px]">HireSys Intelligence</CardTitle>
          </div>
          <Badge variant="accent" size="sm">AI</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
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
                <div key={item.label} className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-default)] bg-[var(--bg-elevated)]">
                  <div className="h-6 w-6 rounded-[var(--radius-default)] bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{item.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  /* ——— BLOCK 4: Upcoming Interviews (Full Width) ——— */
  const secondaryRow = (
    <div className="grid grid-cols-1 gap-5">
      {/* Upcoming Interviews */}
      <Card className="flex flex-col" padding="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <CardTitle className="text-[20px]">Upcoming Interviews</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/interviews")}
            className="text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-muted)] flex items-center gap-1"
          >
            View all
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              <div className="h-14 skeleton rounded-[var(--radius-default)]" />
              <div className="h-14 skeleton rounded-[var(--radius-default)]" />
            </div>
          ) : (
            <EmptyState
              compact
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
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
