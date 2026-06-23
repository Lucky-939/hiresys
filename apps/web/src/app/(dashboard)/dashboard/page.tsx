"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/ui/stat-card";
import { Icons } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useOrganizations } from "@/components/ui/OrganizationSelector";

export default function DashboardPage() {
  const router = useRouter();
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
    api.get("/dashboard/stats", {
      headers: { "x-organization-id": selectedOrgId }
    })
      .then((res) => {
        setStats(res.data.data);
      })
      .catch((err) => {
        console.error("Failed to load dashboard stats", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isReady, selectedOrgId]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Overview</h1>
          <p className="text-sm text-[var(--text-muted)]">Your command center for hiring.</p>
        </div>
        <Button onClick={() => router.push("/dashboard/interviews/new")} className="gap-2">
          {Icons.plus} New Interview
        </Button>
      </div>

      {/* Row 1 — Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[136px] skeleton rounded-xl" />
          ))
        ) : (
          <>
            <StatCard 
              title="Total Candidates" 
              value={stats.totalCandidates} 
              icon={Icons.users} 
              trend={12} 
              trendLabel="vs last month" 
            />
            <StatCard 
              title="Interviews This Week" 
              value={stats.interviewsThisWeek} 
              icon={Icons.calendar} 
              trend={25} 
              trendLabel="3 today" 
            />
            <StatCard 
              title="Hired This Month" 
              value={stats.hiredThisMonth} 
              icon={Icons.checkCircle} 
              trend={-5} 
              trendLabel="vs last month" 
            />
            <StatCard 
              title="Pending Decision" 
              value={stats.pendingDecision} 
              icon={Icons.clock} 
              trend={0} 
            />
          </>
        )}
      </div>

      {/* Row 2 — Kanban & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left (60%): Hiring Pipeline Snapshot */}
        <Card className="lg:col-span-3 flex flex-col min-h-[300px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Pipeline Snapshot</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/pipeline")} className="h-8 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]">
              View Board →
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-x-auto pb-6">
            {loading ? (
              <div className="flex gap-4 mt-4 h-full items-center">
                <div className="w-48 h-32 skeleton" />
                <div className="w-48 h-32 skeleton" />
                <div className="w-48 h-32 skeleton" />
              </div>
            ) : (
              <div className="flex gap-4 min-w-max mt-2">
                <PipelineColumn title="Screening" count={stats.pipelineCounts["SCREENING"] || 0} color="var(--warning-bg)" />
                <PipelineColumn title="Interview" count={stats.pipelineCounts["INTERVIEWING"] || 0} color="var(--accent-muted)" />
                <PipelineColumn title="Evaluation" count={stats.pipelineCounts["OFFER"] || 0} color="var(--info-bg)" />
                <PipelineColumn title="Hired" count={stats.pipelineCounts["HIRED"] || 0} color="var(--success-bg)" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right (40%): Recent Activity */}
        <Card className="lg:col-span-2 flex flex-col min-h-[300px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pr-2">
            {loading ? (
              <div className="space-y-4 mt-4">
                <div className="h-10 skeleton w-full" />
                <div className="h-10 skeleton w-full" />
                <div className="h-10 skeleton w-full" />
              </div>
            ) : stats.recentActivity.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">
                  No recent activity
                </div>
            ) : (
                <div className="space-y-4 mt-4">
                  {stats.recentActivity.map((act: any, i: number) => (
                    <ActivityItem 
                      key={i} 
                      actor={act.actor || "System"} 
                      action={act.action} 
                      time={new Date(act.time).toLocaleDateString()} 
                    />
                  ))}
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Upcoming Interviews & AI Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upcoming Interviews */}
        <Card className="flex flex-col min-h-[300px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 mt-4">
                <div className="h-16 skeleton w-full" />
                <div className="h-16 skeleton w-full" />
              </div>
            ) : (
                <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)] py-4">
                  No upcoming interviews
                </div>
            )}
          </CardContent>
        </Card>

        {/* Right: AI Tools Quick-Launch */}
        <Card className="flex flex-col min-h-[300px] border-[var(--accent-muted)] bg-[var(--accent-muted)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[var(--accent)] flex items-center gap-2">
              AI Tool Hub
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 mt-4">
                <div className="h-16 skeleton w-full bg-white/50 dark:bg-black/20" />
                <div className="h-16 skeleton w-full bg-white/50 dark:bg-black/20" />
                <div className="h-16 skeleton w-full bg-white/50 dark:bg-black/20" />
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                <AIToolCard 
                  title="Resume Analysis" 
                  desc="Instant scoring and skill gap detection." 
                  onClick={() => router.push("/dashboard/resume")} 
                />
                <AIToolCard 
                  title="Question Generator" 
                  desc="Tailored technical & behavioral questions." 
                  onClick={() => router.push("/dashboard/question-gen")} 
                />
                <AIToolCard 
                  title="Code Feedback" 
                  desc="Review and analyze candidate coding sessions." 
                  onClick={() => router.push("/dashboard/coding-rooms")} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helpers

function PipelineColumn({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div className="w-56 shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">{title}</span>
        <Badge variant="neutral" className="bg-[var(--bg-surface)]">{count}</Badge>
      </div>
      <div className="h-1 w-full rounded-full overflow-hidden bg-[var(--border-default)]">
        <div className="h-full w-full" style={{ background: color }}></div>
      </div>
      <div className="h-20 border border-dashed border-[var(--border-strong)] rounded-md flex items-center justify-center bg-[var(--bg-surface)] opacity-50">
        <span className="text-xs text-[var(--text-subtle)]">Drop candidates here</span>
      </div>
    </div>
  )
}

function ActivityItem({ actor, action, time }: { actor: string; action: string; time: string }) {
  const isSystem = actor === "System";
  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--bg-surface)] bg-[var(--bg-elevated)] text-[var(--text-muted)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
        {isSystem ? <span className="text-[var(--accent)] font-bold text-[10px]">sys</span> : <span className="text-xs font-bold text-[var(--text-primary)]">{actor.charAt(0)}</span>}
      </div>
      {/* Card */}
      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{actor}</span> {action}
          </p>
          <time className="text-[10px] uppercase font-mono text-[var(--text-subtle)]">{time}</time>
        </div>
      </div>
    </div>
  )
}

function InterviewRow({ name, role, time }: { name: string; role: string; time: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent)] transition-colors cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-sm font-bold text-[var(--text-primary)]">
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{name}</p>
          <p className="text-xs text-[var(--text-muted)]">{role}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium text-[var(--text-secondary)]">{time}</p>
      </div>
    </div>
  )
}

function AIToolCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="group flex flex-col p-4 rounded-xl border border-white/40 dark:border-[var(--border-strong)] bg-white/60 dark:bg-[var(--bg-surface)] hover:bg-white dark:hover:bg-[var(--bg-elevated)] shadow-sm hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold text-[var(--accent-hover)] group-hover:text-[var(--accent)] transition-colors">{title}</h4>
        <span className="text-[var(--text-subtle)] group-hover:text-[var(--accent)] transition-colors">→</span>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
    </div>
  )
}
