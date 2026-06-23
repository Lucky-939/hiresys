"use client";

import React, { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  stage: string;
  resumeScore: number | null;
  atsScore: number | null;
  createdAt: string;
  organizationId: string;
};

type TimelineEvent = {
  type: string;
  date: string;
  description: string;
};

const STAGE_MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline" }> = {
  APPLIED: { label: "Applied", variant: "outline" },
  SCREENING: { label: "Screening", variant: "warning" },
  INTERVIEWING: { label: "Interview", variant: "default" },
  OFFER: { label: "Offer", variant: "success" },
  HIRED: { label: "Hired", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<{ candidate: Candidate, timeline: TimelineEvent[] } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    api.get(`/candidates/${id}`)
      .then((r) => {
        setData(r.data.data);
      })
      .catch((err: unknown) => {
        toast.error(getErrorMessage(err));
        router.push("/dashboard/candidates");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex gap-6 mt-8">
        <div className="w-1/3 h-96 skeleton rounded-xl" />
        <div className="w-1/3 h-96 skeleton rounded-xl" />
        <div className="w-1/3 h-96 skeleton rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const c = data.candidate;
  const t = data.timeline;
  const initials = c.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const stage = STAGE_MAP[c.stage] ?? STAGE_MAP.APPLIED;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <button onClick={() => router.back()} className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2">
          ← Back to Candidates
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Profile Card */}
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col items-center text-center p-6 border-t-4 border-t-[var(--accent)]">
            <div className="h-24 w-24 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-3xl font-bold shadow-md mb-4">
              {initials}
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{c.name}</h1>
            <p className="text-sm text-[var(--text-muted)] mb-4">Senior Engineer</p>
            
            <Badge variant={stage.variant} className="mb-6">{stage.label}</Badge>

            <div className="w-full flex flex-col gap-3 text-sm text-[var(--text-secondary)] mb-6">
              <div className="flex items-center gap-3 bg-[var(--bg-elevated)] p-2 rounded-md">
                <span className="text-[var(--text-tertiary)]">{Icons.mail}</span>
                <span className="truncate">{c.email}</span>
              </div>
              {c.phone && (
                <div className="flex items-center gap-3 bg-[var(--bg-elevated)] p-2 rounded-md">
                  <span className="text-[var(--text-tertiary)]">{Icons.phone}</span>
                  <span className="truncate">{c.phone}</span>
                </div>
              )}
            </div>

            <div className="w-full flex flex-col gap-2">
              <Button className="w-full justify-center" onClick={() => router.push("/dashboard/interviews")}>Schedule Interview</Button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setAnalyzing(true);
                try {
                  const formData = new FormData();
                  formData.append("resume", file);
                  formData.append("candidateId", id);
                  const res = await api.post("/ai/resume/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                  });
                  const jobId = res.data.jobId;
                  
                  // Poll for results
                  const pollInterval = setInterval(async () => {
                    try {
                      const statusRes = await api.get(`/ai/resume/status/${jobId}`);
                      if (statusRes.data.status === "completed") {
                        clearInterval(pollInterval);
                        setAnalyzing(false);
                        // Refresh candidate data to show resume score
                        const r = await api.get(`/candidates/${id}`);
                        setData(r.data.data);
                      } else if (statusRes.data.status === "failed") {
                        clearInterval(pollInterval);
                        setAnalyzing(false);
                        toast.error("AI analysis failed: " + statusRes.data.error);
                      }
                    } catch (e: unknown) {
                      console.error("Polling error", e);
                    }
                  }, 2000);
                } catch(e: unknown) {
                  setAnalyzing(false);
                  toast.error(getErrorMessage(e));
                }
              }} />
              <Button variant="outline" className="w-full justify-center" onClick={() => fileInputRef.current?.click()} disabled={analyzing}>
                {analyzing ? "Analyzing..." : "AI Analyze"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Column 2: Timeline / History */}
        <div className="flex flex-col gap-6">
          <Card className="flex-1 min-h-[400px]">
            <CardHeader className="border-b border-[var(--border-default)] pb-4">
              <CardTitle className="flex items-center gap-2">
                {Icons.calendar} Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative border-l border-[var(--border-default)] ml-3 space-y-8">
                {t.map((ev, i) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg-surface)]" />
                    <p className="text-sm font-medium text-[var(--text-primary)]">{ev.description}</p>
                    <time className="text-xs text-[var(--text-subtle)] mt-1 block">
                      {new Date(ev.date).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </time>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 3: AI Panel */}
        <div className="flex flex-col gap-6">
          <Card className="flex-1 border-[var(--accent-muted)] bg-[var(--accent-muted)] min-h-[400px]">
            <CardHeader className="border-b border-white/20 dark:border-black/20 pb-4">
              <CardTitle className="text-[var(--accent)] flex items-center gap-2">
                AI Resume Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {c.resumeScore ? (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center justify-center bg-white dark:bg-[var(--bg-surface)] p-6 rounded-xl shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-2">Match Score</span>
                    <span className="text-5xl font-bold text-[var(--success-text)]">{c.resumeScore}<span className="text-2xl text-[var(--text-muted)]">/100</span></span>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                        <span className="text-[var(--success-text)]">↑</span> Strengths
                      </h4>
                      <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                        <li>TypeScript & React</li>
                        <li>System Design</li>
                        <li>Leadership experience</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                        <span className="text-[var(--warning-text)]">↓</span> Gaps
                      </h4>
                      <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                        <li>Cloud infrastructure (AWS/GCP)</li>
                      </ul>
                    </div>
                  </div>

                  <Button variant="default" className="mt-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white justify-center" onClick={() => router.push("/dashboard/interviews")}>
                    View Full AI Report →
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-4">
                  <p className="text-sm text-[var(--text-secondary)]">Upload a resume to get instant AI scoring, strength analysis, and tailored interview questions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
