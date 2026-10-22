"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { ActivityTimeline } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AIMatchBar } from "@/components/ui/PageHeader";
import { Icons } from "@/components/ui/Icons";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { useOrganizations } from "@/components/ui/OrganizationSelector";
import { cn, hasCompletedInterview } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";
import { toast } from "sonner";
import { StructuredResumeView } from "./StructuredResumeView";

function getTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

type CandidateProfileContentProps = {
  candidateId: string;
  layout: "panel" | "full";
};

export function CandidateProfileContent({ candidateId, layout }: CandidateProfileContentProps) {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Organization and RBAC for outcome emails
  const { orgs, selectedOrgId } = useOrganizations();
  const currentOrg = (data?.candidate?.organizationId && orgs.find(o => o.id === data.candidate.organizationId)) || orgs.find(o => o.id === selectedOrgId);
  const canSendOutcomeEmail = ["OWNER", "ADMIN", "RECRUITER"].includes(currentOrg?.role || "");

  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [outcomeTemplate, setOutcomeTemplate] = useState<"OFFER" | "REJECTION">("OFFER");
  const [outcomeSubject, setOutcomeSubject] = useState("");
  const [outcomeMessage, setOutcomeMessage] = useState("");
  const [isSendingOutcome, setIsSendingOutcome] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [outcomeViewMode, setOutcomeViewMode] = useState<"edit" | "preview">("edit");
  const confirmBannerRef = useRef<HTMLDivElement>(null);

  // Pipeline Stages state for 1-click stage management
  const [stages, setStages] = useState<any[]>([]);
  const [isMovingStage, setIsMovingStage] = useState(false);

  // Resume Viewer Modal State
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resumeCopied, setResumeCopied] = useState(false);
  const [resumeViewMode, setResumeViewMode] = useState<"pdf" | "text">("pdf");

  const handleCopyResume = async () => {
    if (!data?.candidate?.resumeText) return;
    try {
      await navigator.clipboard.writeText(data.candidate.resumeText);
      setResumeCopied(true);
      toast.success("Resume text copied to clipboard");
      setTimeout(() => setResumeCopied(false), 2000);
    } catch {
      toast.error("Failed to copy resume text");
    }
  };

  useEffect(() => {
    if (showConfirmSend) {
      setTimeout(() => {
        confirmBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 60);
    }
  }, [showConfirmSend]);

  const getOfferTemplate = (name: string, jobTitle: string, orgName: string) => ({
    subject: `Next Steps: Your application for ${jobTitle} at ${orgName}`,
    message: `Dear ${name},\n\nWe are pleased to inform you that we would like to move forward with your application for the ${jobTitle} position at ${orgName}!\n\nOur team was thoroughly impressed by your background, experience, and the discussions during our interviews. We will follow up shortly with additional details regarding next steps.\n\nWarm regards,\nThe Hiring Team at ${orgName}`
  });

  const getRejectionTemplate = (name: string, jobTitle: string, orgName: string) => ({
    subject: `Update regarding your application for ${jobTitle} at ${orgName}`,
    message: `Dear ${name},\n\nThank you for your time and interest in the ${jobTitle} position at ${orgName}, and for speaking with our team.\n\nAfter careful consideration, we have decided not to move forward with your candidacy for this role. We appreciate the opportunity to learn about your qualifications and wish you every success in your future endeavors.\n\nWarm regards,\nThe Hiring Team at ${orgName}`
  });

  const handleOpenOutcomeModal = () => {
    const jobTitle = c?.job?.title || "Position";
    const orgName = currentOrg?.name || "HireSys";
    const isNegative = stage?.type === "NEGATIVE_TERMINAL";
    const initialType = isNegative ? "REJECTION" : "OFFER";
    setOutcomeTemplate(initialType);
    const tmpl = initialType === "OFFER" 
      ? getOfferTemplate(c?.name || "Candidate", jobTitle, orgName)
      : getRejectionTemplate(c?.name || "Candidate", jobTitle, orgName);
    setOutcomeSubject(tmpl.subject);
    setOutcomeMessage(tmpl.message);
    setShowConfirmSend(false);
    setOutcomeViewMode("edit");
    setIsOutcomeModalOpen(true);
  };

  const handleSelectTemplate = (type: "OFFER" | "REJECTION") => {
    setOutcomeTemplate(type);
    const jobTitle = c?.job?.title || "Position";
    const orgName = currentOrg?.name || "HireSys";
    const tmpl = type === "OFFER"
      ? getOfferTemplate(c?.name || "Candidate", jobTitle, orgName)
      : getRejectionTemplate(c?.name || "Candidate", jobTitle, orgName);
    setOutcomeSubject(tmpl.subject);
    setOutcomeMessage(tmpl.message);
    setShowConfirmSend(false);
  };

  const handleSendOutcome = async () => {
    if (!outcomeSubject.trim() || !outcomeMessage.trim()) {
      toast.error("Subject and message are required.");
      return;
    }
    setIsSendingOutcome(true);
    try {
      await api.post(`/candidates/${c.id}/outcome-email`, {
        templateType: outcomeTemplate,
        subject: outcomeSubject.trim(),
        message: outcomeMessage.trim(),
      });
      toast.success("Outcome email sent successfully");
      setIsOutcomeModalOpen(false);
      setShowConfirmSend(false);
      try {
        const res = await api.get(`/candidates/${candidateId}`);
        setData(res.data.data);
      } catch (refreshErr) {
        console.error("Failed to refresh candidate profile:", refreshErr);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setShowConfirmSend(false);
    } finally {
      setIsSendingOutcome(false);
    }
  };


  useEffect(() => {
    setLoading(true);
    setData(null);
    api.get(`/candidates/${candidateId}`)
      .then(r => {
        setData(r.data.data);
        const orgId = r.data.data?.candidate?.organizationId || selectedOrgId;
        if (orgId) {
          api.get(`/organizations/${orgId}/stages`)
            .then(sRes => setStages(sRes.data.data || []))
            .catch(() => {});
        }
      })
      .catch(err => {
        toast.error(getErrorMessage(err));
        if (layout === "full") {
          router.push("/dashboard/candidates");
        }
      })
      .finally(() => setLoading(false));
  }, [candidateId, layout, router, selectedOrgId]);

  const handleMoveCandidateStage = async (targetStageId: string) => {
    if (!data?.candidate?.id || targetStageId === data?.candidate?.stageId || isMovingStage) return;
    setIsMovingStage(true);
    const targetStage = stages.find(s => s.id === targetStageId);
    try {
      await api.patch(`/candidates/${data.candidate.id}/stage`, { stage: targetStageId, stageId: targetStageId });
      setData((prev: any) => ({
        ...prev,
        candidate: {
          ...prev.candidate,
          stageId: targetStageId,
          pipelineStage: targetStage || prev.candidate.pipelineStage,
        }
      }));
      toast.success(`Candidate moved to ${targetStage?.name || "stage"}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsMovingStage(false);
    }
  };

  const handleAdvanceStage = async () => {
    const curStageId = data?.candidate?.stageId || data?.candidate?.pipelineStage?.id;
    const curIdx = stages.findIndex(s => s.id === curStageId);
    if (curIdx < 0 || curIdx >= stages.length - 1) {
      toast.info("Candidate is already at the final stage.");
      return;
    }
    const nextStg = stages[curIdx + 1];
    await handleMoveCandidateStage(nextStg.id);
  };

  if (loading) {
    if (layout === "full") {
      return (
        <div className="flex gap-6 mt-8">
          <div className="w-1/3 h-96 skeleton rounded-[var(--radius-default)]" />
          <div className="w-1/3 h-96 skeleton rounded-[var(--radius-default)]" />
          <div className="w-1/3 h-96 skeleton rounded-[var(--radius-default)]" />
        </div>
      );
    }
    return (
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Skeleton width={64} height={64} rounded="full" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton width="50%" height={18} />
            <Skeleton width="35%" height={13} />
          </div>
        </div>
        <Skeleton height={120} rounded="md" />
        <Skeleton height={80} rounded="md" />
        <Skeleton height={200} rounded="md" />
      </div>
    );
  }

  if (!data) return null;

  const c = data.candidate;
  const timeline = data.timeline ?? [];
  const stage = c.pipelineStage || { name: "Unknown", color: "#666", type: "STANDARD" };

  const tabs = [
    { id: "overview",   label: "Overview"   },
    { id: "timeline",   label: "Timeline", count: timeline.length },
    { id: "interviews", label: "Interviews" },
  ];

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("resume", file); formData.append("candidateId", candidateId);
      const res = await api.post("/ai/resume", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const jobId = res.data.jobId;
      const poll = setInterval(async () => {
        const s = await api.get(`/ai/resume/status/${jobId}`);
        if (s.data.status === "completed") { clearInterval(poll); setAnalyzing(false); const r = await api.get(`/candidates/${candidateId}`); setData(r.data.data); }
        else if (s.data.status === "failed") { clearInterval(poll); setAnalyzing(false); toast.error("Analysis failed"); }
      }, 2000);
    } catch(err: unknown) { setAnalyzing(false); toast.error(getErrorMessage(err)); }
  };

  const executeActionButtons = () => {
    const curIdx = stages.findIndex(s => s.id === (c.stageId || stage.id));
    const nextStg = curIdx >= 0 && curIdx < stages.length - 1 ? stages[curIdx + 1] : null;

    const advanceButton = nextStg && stage.type !== "POSITIVE_TERMINAL" && stage.type !== "NEGATIVE_TERMINAL" && (
      <Button
        size="sm"
        className={layout === "full" ? "w-full justify-center bg-[var(--accent)] text-white hover:brightness-110 flex items-center gap-1.5 shadow-sm" : "bg-[var(--accent)] text-white hover:brightness-110 flex items-center gap-1 shadow-sm text-xs"}
        onClick={handleAdvanceStage}
        loading={isMovingStage}
      >
        <span>Advance to {nextStg.name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </Button>
    );

    let primaryButton: React.ReactNode = null;
    if (stage.type === "STANDARD") {
      primaryButton = (
        <Button size="sm" className={layout === "full" ? "w-full justify-center" : ""} onClick={() => router.push(`/dashboard/interviews?new=true&candidateId=${c.id}`)}>
          Schedule Interview
        </Button>
      );
    } else if (stage.type === "POSITIVE_TERMINAL" || stage.type === "NEGATIVE_TERMINAL") {
      primaryButton = (
        <Button size="sm" className={layout === "full" ? "w-full justify-center" : ""} onClick={() => {
          if (layout === "panel") {
            setActiveTab("interviews");
          } else {
            document.getElementById('interviews-section')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}>
          View Interviews
        </Button>
      );
    }

    const viewResumeButton = (
      <Button
        size="sm"
        variant="outline"
        className={layout === "full" ? "w-full justify-center" : ""}
        onClick={() => {
          setResumeViewMode(c?.resumeUrl ? "pdf" : "text");
          setIsResumeModalOpen(true);
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 shrink-0">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        View Resume
      </Button>
    );

    const outcomeButton = canSendOutcomeEmail && (
      <Button
        size="sm"
        variant="outline"
        className={layout === "full" ? "w-full justify-center" : ""}
        onClick={handleOpenOutcomeModal}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 shrink-0">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        Send outcome email
      </Button>
    );

    const stageSelect = stages.length > 0 && (
      <div className={layout === "full" ? "w-full flex items-center gap-2 pt-1" : "flex items-center gap-1.5"}>
        <span className="text-xs font-semibold text-[var(--text-muted)] shrink-0">Move to:</span>
        <select
          value={c.stageId || stage.id}
          disabled={isMovingStage}
          onChange={(e) => handleMoveCandidateStage(e.target.value)}
          className="h-8 flex-1 px-2 text-xs rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        >
          {stages.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} {s.id === (c.stageId || stage.id) ? "(Current)" : ""}
            </option>
          ))}
        </select>
      </div>
    );

    return (
      <div className={layout === "full" ? "flex flex-col gap-2 w-full" : "flex items-center flex-wrap gap-2"}>
        {advanceButton}
        {primaryButton}
        {viewResumeButton}
        {outcomeButton}
        {stageSelect}
      </div>
    );
  };

  const renderInterviewsList = () => (
    <div className="flex flex-col gap-4" id={layout === "full" ? "interviews-section" : undefined}>
      {c.interviews && c.interviews.length > 0 ? (
        <>
          {c.interviews.map((interview: any) => (
            <Card key={interview.id} padding="default" className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{interview.title}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                  <Badge variant={interview.status === "COMPLETED" ? "success" : "neutral"} size="sm">{interview.status}</Badge>
                  {interview.scheduledAt && (
                    <span>{new Date(interview.scheduledAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                  )}
                </div>
              </div>
              {interview.status === "COMPLETED" ? (
                <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/interviews/${interview.id}`)}>View Report</Button>
              ) : (
                <Button size="sm" onClick={() => router.push(`/dashboard/interviews`)}>View Session</Button>
              )}
            </Card>
          ))}
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/interviews?new=true&candidateId=${c.id}`)}>
              Schedule Another Interview
            </Button>
          </div>
        </>
      ) : (
        <EmptyState
          compact
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          title="No interviews yet"
          description="Schedule an interview to begin evaluating this candidate."
          action={
            <Button size="sm" onClick={() => router.push(`/dashboard/interviews?new=true&candidateId=${c.id}`)}>
              Schedule Interview
            </Button>
          }
        />
      )}
    </div>
  );

  const renderTimeline = () => (
    <div>
      {timeline.length === 0 ? (
        <EmptyState
          compact
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          title="No timeline events"
          description="Activity will appear here as the candidate progresses."
        />
      ) : (
        <ActivityTimeline
          items={timeline.map((ev: any) => ({
            title: ev.description,
            timestamp: new Date(ev.date).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
            variant: ev.type === "HIRED" ? "success" : ev.type === "REJECTED" ? "danger" : "default",
          }))}
        />
      )}
    </div>
  );

  const renderAIPanel = () => {
    const hasScore = c.resumeScore !== null && c.resumeScore !== undefined;
    if (!hasScore) {
      return (
        <Card padding={layout === "full" ? "none" : "default"} className={layout === "full" ? "flex-1 min-h-[400px]" : ""}>
          {layout === "full" ? (
            <>
              <CardHeader className="border-b border-[var(--border-default)] pb-4 mb-6">
                <CardTitle className="flex items-center gap-2">AI Resume Analysis</CardTitle>
              </CardHeader>
              <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-4">
                <EmptyState
                  compact
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                  title="Resume analysis pending"
                  description="AI resume evaluation is running or waiting in the background queue."
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Resume Analysis</h3>
              </div>
              <EmptyState
                compact
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                title="Resume analysis pending"
                description="AI resume evaluation is running or waiting in the background queue."
              />
            </>
          )}
        </Card>
      );
    }

    const analysis = c.resumeAnalysis || {};
    const score = c.resumeScore;

    // Qualitative Match Tier
    const tier = score >= 80 ? {
      label: "Strong Alignment",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    } : score >= 65 ? {
      label: "Solid Role Fit",
      color: "text-[var(--accent)]",
      bg: "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]",
    } : score >= 50 ? {
      label: "Moderate Match",
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    } : {
      label: "Gaps Identified",
      color: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
    };

    // Normalize lists safely
    const strengthsList: { point: string; evidence: string }[] = (analysis.strengths || []).map((s: any) =>
      typeof s === "string" ? { point: s, evidence: "" } : { point: s.point || "", evidence: s.evidence || "" }
    );

    const weaknessesList: { issue: string; severity: string; fix: string }[] = (analysis.weaknesses || []).map((w: any) =>
      typeof w === "string" ? { issue: w, severity: "Medium", fix: "" } : { issue: w.issue || "", severity: w.severity || "Medium", fix: w.fix || "" }
    );

    const matchedKeywords: string[] = (analysis.matchedKeywords || []).map((k: any) =>
      typeof k === "string" ? k : (k.keyword || String(k))
    );

    const missingKeywords: { keyword: string; reason?: string }[] = (analysis.missingKeywords || []).map((m: any) =>
      typeof m === "string" ? { keyword: m } : { keyword: m.keyword || String(m), reason: m.reason || "" }
    );

    const content = (
      <div className="flex flex-col gap-5 w-full">
        {/* Match Score Banner */}
        <div className="flex flex-col items-center justify-center bg-[var(--bg-elevated)] p-5 rounded-[var(--radius-default)] border border-[var(--border-default)] text-center relative overflow-hidden">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              AI Resume Match
            </span>
            <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", tier.bg)}>
              {tier.label}
            </span>
          </div>

          <div className="flex items-baseline justify-center gap-1 my-1">
            <span className={cn("text-5xl font-black font-mono tabular-nums tracking-tight", tier.color)}>
              {score}
            </span>
            <span className="text-xl font-bold text-[var(--text-muted)] font-mono">/100</span>
          </div>

          {analysis.atsScore && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span>ATS Parsability: <strong className="text-[var(--text-primary)] font-mono">{analysis.atsScore}%</strong></span>
            </div>
          )}

          {/* Score Rationale Callout */}
          {analysis.scoreExplanation ? (
            <div className="mt-4 w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] text-left text-xs leading-relaxed">
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)]">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span>Score Rationale</span>
              </div>
              <p className="text-[var(--text-secondary)]">{analysis.scoreExplanation}</p>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--text-muted)] mt-2 italic">
              AI-assisted estimate evaluated against job specifications
            </span>
          )}

          {/* Breakdown Metrics */}
          {analysis.breakdown && typeof analysis.breakdown === "object" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-2.5 w-full mt-4 pt-3 border-t border-[var(--border-divider)] text-left">
              {Object.entries(analysis.breakdown).map(([k, v]: [string, any]) => (
                <div key={k} className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-muted)] gap-2">
                    <span className="capitalize font-semibold text-[var(--text-secondary)] truncate">{k}</span>
                    <span className="font-mono font-bold text-[var(--text-primary)] shrink-0">{v}%</span>
                  </div>
                  <div className="w-full bg-[var(--bg-base)] h-1.5 rounded-full overflow-hidden border border-[var(--border-divider)]">
                    <div
                      className="bg-[var(--accent)] h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, typeof v === "number" ? v : 0))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills Alignment: Matched vs Missing */}
        <div className="space-y-3.5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Matched Skills & Qualifications ({matchedKeywords.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {matchedKeywords.length > 0 ? (
                matchedKeywords.map((k, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    {k}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[var(--text-muted)] italic">No explicit matching skills found</span>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Missing Skills / Job Requirements ({missingKeywords.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {missingKeywords.length > 0 ? (
                missingKeywords.map((m, i) => (
                  <span
                    key={i}
                    title={m.reason || "Missing requirement from job description"}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    {m.keyword}
                    {m.reason && <span className="text-[10px] opacity-75">· {m.reason}</span>}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[var(--text-muted)] italic">No critical skill gaps flagged against role requirements</span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-default)]" />

        {/* Strengths with Evidence */}
        {strengthsList.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              Key Strengths (Why Score is High)
            </h4>
            <div className="space-y-2">
              {strengthsList.map((s, i) => (
                <div key={i} className="p-3 rounded-[var(--radius-default)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs">
                  <div className="font-semibold text-[var(--text-primary)] flex items-start gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500 mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{s.point}</span>
                  </div>
                  {s.evidence && (
                    <p className="mt-1.5 text-[var(--text-secondary)] pl-3 border-l-2 border-emerald-500/40 italic leading-relaxed">
                      "{s.evidence}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses / Concerns with Actionable Fix */}
        {weaknessesList.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              Concerns & Gaps to Probe
            </h4>
            <div className="space-y-2">
              {weaknessesList.map((w, i) => (
                <div key={i} className="p-3 rounded-[var(--radius-default)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-[var(--text-primary)] flex items-start gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 mt-0.5 shrink-0">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span>{w.issue}</span>
                    </div>
                    {w.severity && (
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0",
                        w.severity.toLowerCase() === "high" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                        w.severity.toLowerCase() === "medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                        "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20"
                      )}>
                        {w.severity}
                      </span>
                    )}
                  </div>
                  {w.fix && (
                    <div className="text-[var(--text-secondary)] text-[11px] pl-3 border-l-2 border-amber-500/40 leading-relaxed">
                      <strong className="text-[var(--text-primary)] font-medium">Guidance:</strong> {w.fix}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recruiter Perspective */}
        {analysis.recruiterPerspective && (
          <div className="p-3.5 rounded-[var(--radius-default)] bg-[var(--bg-elevated)] border border-[var(--border-default)] space-y-2 text-xs">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>Recruiter & Interviewer Perspective</span>
            </div>
            {analysis.recruiterPerspective.firstImpression && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">First Impression:</span>
                <p className="text-[var(--text-secondary)] leading-relaxed mt-0.5">{analysis.recruiterPerspective.firstImpression}</p>
              </div>
            )}
            {analysis.recruiterPerspective.hiringRisks && (
              <div className="pt-2 border-t border-[var(--border-divider)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Suggested Interview Probes:</span>
                <p className="text-[var(--text-secondary)] leading-relaxed mt-0.5">{analysis.recruiterPerspective.hiringRisks}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center flex items-center gap-1.5"
            onClick={() => {
              setResumeViewMode(c?.resumeUrl ? "pdf" : "text");
              setIsResumeModalOpen(true);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            View Full Resume
          </Button>
        </div>
      </div>
    );

    return (
      <Card className={layout === "full" ? "flex-1 min-h-[400px]" : ""}>
        {layout === "full" ? (
          <>
            <CardHeader className="border-b border-[var(--border-default)] pb-4 mb-4 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)]"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                AI Resume Analysis
              </CardTitle>
              <Badge variant="accent" size="sm">AI Evaluation</Badge>
            </CardHeader>
            <div>
              {content}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Resume Analysis</h3>
              <Badge variant="accent" size="sm">AI</Badge>
            </div>
            {content}
          </>
        )}
      </Card>
    );
  };

  const renderResumeModal = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const normalizedBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
    const pdfUrl = c?.id ? `${normalizedBase}/candidates/${c.id}/resume/file${token ? `?token=${encodeURIComponent(token)}` : ""}` : null;
    const hasPdf = Boolean(c?.resumeUrl);
    const hasText = Boolean(c?.resumeText && c.resumeText.trim().length > 0);
    const wordCount = c?.resumeText ? c.resumeText.trim().split(/\s+/).filter(Boolean).length : 0;

    return (
      <Modal
        open={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        title={`Candidate Resume — ${c?.name || "Candidate"}`}
        description={c?.job?.title ? `Application document & structured profile for ${c.job.title}` : "Candidate application document"}
        size="2xl"
        footer={
          <div className="flex flex-wrap items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              {hasPdf && pdfUrl && (
                <>
                  <a
                    href={pdfUrl}
                    download={`${(c?.name || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_")}_Resume.pdf`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-default)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download PDF
                  </a>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-default)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Open in New Tab
                  </a>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsResumeModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* View Mode Toggle Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
            <div className="flex items-center bg-[var(--bg-base)] p-1 rounded-[var(--radius-default)] border border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setResumeViewMode("pdf")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-default)] text-xs font-semibold transition-all cursor-pointer",
                  resumeViewMode === "pdf"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>Original PDF Document</span>
                {hasPdf && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-0.5" title="Original PDF available on file" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setResumeViewMode("text")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-default)] text-xs font-semibold transition-all cursor-pointer",
                  resumeViewMode === "text"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
                </svg>
                <span>Structured & Extracted Profile</span>
                {wordCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                    {wordCount}w
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              {resumeViewMode === "pdf" ? (
                hasPdf ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Original Document Attached
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">PDF Not Uploaded</span>
                )
              ) : (
                <span>Clean semantic presentation</span>
              )}
            </div>
          </div>

          {/* Mode 1: PDF Viewer */}
          {resumeViewMode === "pdf" && (
            <div>
              {hasPdf && pdfUrl ? (
                <div className="relative rounded-[var(--radius-default)] overflow-hidden border border-[var(--border-default)] bg-neutral-100 dark:bg-neutral-900 shadow-inner">
                  <iframe
                    src={pdfUrl}
                    title={`${c?.name || "Candidate"} Resume PDF`}
                    className="w-full h-[68vh] border-0"
                  />
                </div>
              ) : (
                <div className="p-8 border border-dashed border-[var(--border-default)] rounded-[var(--radius-default)] bg-[var(--bg-elevated)] flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                  </div>
                  <div className="max-w-md">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">No PDF document stored for this candidate</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      This record was submitted without a PDF file attachment. You can review the candidate's extracted profile in the adjacent tab.
                    </p>
                  </div>
                  {hasText && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setResumeViewMode("text")}
                    >
                      View Extracted Profile Instead
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Structured Extracted Profile */}
          {resumeViewMode === "text" && (
            <div>
              {hasText ? (
                <StructuredResumeView
                  resumeText={c.resumeText}
                  candidateName={c.name}
                  candidateEmail={c.email}
                />
              ) : (
                <EmptyState
                  compact
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                  title="No resume text available"
                  description="Candidate did not submit an extractable resume document, or resume processing is currently in queue."
                />
              )}
            </div>
          )}
        </div>
      </Modal>
    );
  };

  const renderOutcomeModal = () => (
      <Modal
        open={isOutcomeModalOpen}
        onClose={() => {
          if (!isSendingOutcome) {
            setIsOutcomeModalOpen(false);
            setShowConfirmSend(false);
          }
        }}
        title="Send Outcome Email"
        description="Select an outcome template, preview or customize the message, and confirm before sending."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {showConfirmSend ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmSend(false)}
                  disabled={isSendingOutcome}
                >
                  Back to Edit
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOutcomeModalOpen(false)}
                  disabled={isSendingOutcome}
                >
                  Cancel
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!showConfirmSend ? (
                <Button
                  size="sm"
                  onClick={() => {
                    if (!outcomeSubject.trim() || !outcomeMessage.trim()) {
                      toast.error("Please fill in both the subject and message.");
                      return;
                    }
                    setShowConfirmSend(true);
                    setTimeout(() => {
                      confirmBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                    }, 60);
                  }}
                  disabled={isSendingOutcome}
                >
                  Review &amp; Confirm
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSendOutcome}
                  loading={isSendingOutcome}
                  className="bg-[#0F6E56] hover:bg-[#0A4E3D] text-white"
                >
                  Confirm &amp; Send Email
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Template Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Outcome Template
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectTemplate("OFFER")}
                disabled={isSendingOutcome}
                className={cn(
                  "p-3 rounded-[var(--radius-default)] border text-left transition-all",
                  outcomeTemplate === "OFFER"
                    ? "border-[#0F6E56] bg-[#0F6E56]/10 text-[var(--text-primary)] ring-1 ring-[#0F6E56]"
                    : "border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                )}
              >
                <div className="text-sm font-semibold text-[var(--text-primary)]">Move forward / offer</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">Formal next steps or offer notification</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTemplate("REJECTION")}
                disabled={isSendingOutcome}
                className={cn(
                  "p-3 rounded-[var(--radius-default)] border text-left transition-all",
                  outcomeTemplate === "REJECTION"
                    ? "border-[#0F6E56] bg-[#0F6E56]/10 text-[var(--text-primary)] ring-1 ring-[#0F6E56]"
                    : "border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                )}
              >
                <div className="text-sm font-semibold text-[var(--text-primary)]">Not moving forward</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">Polite rejection update</div>
              </button>
            </div>
          </div>

          {/* View mode toggle (Edit vs Preview) */}
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2 pt-1">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Recipient: <strong className="text-[var(--text-primary)]">{c?.email}</strong>
            </span>
            <div className="flex items-center bg-[var(--bg-base)] p-0.5 rounded-[var(--radius-default)] border border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setOutcomeViewMode("edit")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-sm transition-colors",
                  outcomeViewMode === "edit"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                Edit Message
              </button>
              <button
                type="button"
                onClick={() => setOutcomeViewMode("preview")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-sm transition-colors",
                  outcomeViewMode === "preview"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                Ledger Email Preview
              </button>
            </div>
          </div>

          {outcomeViewMode === "edit" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Subject</label>
                <Input
                  value={outcomeSubject}
                  onChange={(e) => setOutcomeSubject(e.target.value)}
                  disabled={isSendingOutcome}
                  placeholder="Email subject..."
                  className="w-full text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Message</label>
                <Textarea
                  value={outcomeMessage}
                  onChange={(e) => setOutcomeMessage(e.target.value)}
                  disabled={isSendingOutcome}
                  rows={5}
                  placeholder="Email message..."
                  className="w-full text-sm leading-relaxed font-sans"
                />
              </div>

              <div className="p-3 bg-[var(--bg-elevated)] rounded-[var(--radius-default)] border border-[var(--border-default)] text-xs text-[var(--text-muted)] flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5 text-[#0F6E56]">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>
                  <strong>Privacy Protected:</strong> AI scores, analysis, interviewer notes, and reports are strictly excluded and cannot reach candidate outcome emails.
                </span>
              </div>
            </div>
          ) : (
            /* Ledger Email Preview Card */
            <div className="p-4 bg-[#f7f7f5] rounded-[var(--radius-default)] border border-[#e5e5e0]">
              <div className="max-w-[520px] mx-auto bg-white border border-[#e5e5e0] rounded-lg overflow-hidden shadow-xs">
                {/* Header (Flat solid #0F6E56, no gradient) */}
                <div className="bg-[#0F6E56] text-white p-5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-white">{currentOrg?.name || "HireSys"}</span>
                    <span className="opacity-90">Application Update</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-3 mb-0">
                    {c?.job?.title ? `${c.job.title} Update` : "Application Update"}
                  </h3>
                </div>
                {/* Content */}
                <div className="p-6 text-sm text-[#374151] space-y-3 leading-relaxed whitespace-pre-wrap font-sans">
                  {outcomeMessage}
                </div>
                {/* Footer */}
                <div className="bg-[#f9fafb] border-t border-[#e5e7eb] p-4 text-center text-xs text-[#9ca3af]">
                  This message was sent by {currentOrg?.name || "HireSys"} via HireSys.<br />
                  &copy; {new Date().getFullYear()} {currentOrg?.name || "HireSys"}. All rights reserved.
                </div>
              </div>
            </div>
          )}

          {/* Confirm step banner */}
          {showConfirmSend && (
            <div
              ref={confirmBannerRef}
              className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-[var(--radius-default)] text-xs text-[var(--text-primary)] space-y-1.5 animate-fadeIn scroll-mt-6 ring-2 ring-amber-500/20"
            >
              <div className="font-semibold text-amber-600 dark:text-amber-500 flex items-center gap-1.5 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Confirm Email Delivery
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed text-xs">
                You are about to send this outcome email to <strong className="text-[var(--text-primary)]">{c?.email}</strong>. Once sent, this email will be delivered immediately and logged in the candidate timeline.
              </p>
            </div>
          )}
        </div>
      </Modal>
  );

  // --- FULL LAYOUT ---
  if (layout === "full") {
    const initials = c.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
    return (
      <div className="flex flex-col h-full w-full">
        {/* Interactive Pipeline Stage Stepper */}
        {stages.length > 0 && (
          <Card className="mb-6 p-4 border border-[var(--border-default)] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Pipeline Stage
                </span>
                <Badge variant="neutral" dot style={{ borderLeft: `3px solid ${stage.color}` }}>
                  {stage.name}
                </Badge>
              </div>

              {(() => {
                const curIdx = stages.findIndex(s => s.id === (c.stageId || stage.id));
                const nextStg = curIdx >= 0 && curIdx < stages.length - 1 ? stages[curIdx + 1] : null;
                if (!nextStg || stage.type === "POSITIVE_TERMINAL" || stage.type === "NEGATIVE_TERMINAL") return null;
                return (
                  <Button
                    size="sm"
                    onClick={handleAdvanceStage}
                    loading={isMovingStage}
                    className="h-7 text-xs bg-[var(--accent)] text-white hover:brightness-110 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Advance to {nextStg.name}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </Button>
                );
              })()}
            </div>

            {/* Stage Stepper Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {stages.map((stg, idx) => {
                const curIdx = stages.findIndex(s => s.id === (c.stageId || stage.id));
                const isCurrent = stg.id === (c.stageId || stage.id);
                const isPast = curIdx > idx;

                return (
                  <React.Fragment key={stg.id}>
                    <button
                      type="button"
                      onClick={() => handleMoveCandidateStage(stg.id)}
                      disabled={isMovingStage || isCurrent}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
                        isCurrent
                          ? "bg-[var(--accent)] text-white shadow-xs ring-2 ring-[var(--accent)]/30"
                          : isPast
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                      )}
                      title={isCurrent ? "Current Stage" : `Click to move candidate to ${stg.name}`}
                    >
                      <span className={cn(
                        "h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                        isCurrent ? "bg-white text-[var(--accent)]" : isPast ? "bg-emerald-500 text-white" : "bg-[var(--border-default)] text-[var(--text-muted)]"
                      )}>
                        {isPast ? "✓" : idx + 1}
                      </span>
                      <span>{stg.name}</span>
                    </button>
                    {idx < stages.length - 1 && (
                      <span className="text-[var(--border-default)] text-xs shrink-0">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Profile Card & Interviews */}
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col items-center text-center p-6 border-t-4 border-t-[var(--accent)]">
              <div className="h-24 w-24 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-3xl font-bold shadow-md mb-4">
                {initials}
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{c.name}</h1>
              <p className="text-sm text-[var(--text-muted)] mb-4">{c.job?.title || "General Application"}</p>
              
              <div className="flex items-center gap-2 mb-6">
                <Badge variant="neutral" dot style={{ borderLeft: `3px solid ${stage.color}` }}>{stage.name}</Badge>
                {c.resumeScore !== null && c.resumeScore !== undefined && (
                  <Badge variant={c.resumeScore >= 80 ? "success" : c.resumeScore >= 60 ? "accent" : c.resumeScore >= 40 ? "warning" : "danger"} size="sm" title="AI-assisted estimate, not a hiring decision">Score {c.resumeScore}/100 (Advisory)</Badge>
                )}
              </div>

              <div className="w-full flex flex-col gap-3 text-sm text-[var(--text-secondary)] mb-6">
                <div className="flex items-center gap-3 bg-[var(--bg-elevated)] p-2 rounded-[var(--radius-default)]">
                  <span className="text-[var(--text-muted)]">{Icons.mail}</span>
                  <span className="truncate">{c.email}</span>
                </div>
                {c.phone && (
                  <div className="flex items-center gap-3 bg-[var(--bg-elevated)] p-2 rounded-[var(--radius-default)]">
                    <span className="text-[var(--text-muted)]">{Icons.phone}</span>
                    <span className="truncate">{c.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-center bg-[var(--bg-elevated)] p-2 rounded-[var(--radius-default)] text-xs font-mono text-[var(--text-muted)] mt-2">
                   Added {getTimeAgo(c.createdAt)}
                </div>
              </div>

              <div className="w-full flex flex-col gap-2">
                {executeActionButtons()}
              </div>
            </Card>

            <Card className="flex-1 min-h-[300px]">
               <CardHeader className="border-b border-[var(--border-default)] pb-4 mb-4">
                 <CardTitle className="flex items-center gap-2">
                   Interviews
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-6 pt-0">
                  {renderInterviewsList()}
               </CardContent>
            </Card>

          </div>

          {/* Column 2: Submitted Resume & Timeline */}
          <div className="flex flex-col gap-6">
            {(c.resumeUrl || c.resumeText) && (
              <Card className="flex-1">
                <CardHeader className="border-b border-[var(--border-default)] pb-4 mb-4 flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    Submitted Resume
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {c.resumeUrl && <Badge variant="success" size="sm">PDF</Badge>}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResumeViewMode(c.resumeUrl ? "pdf" : "text");
                        setIsResumeModalOpen(true);
                      }}
                    >
                      {c.resumeUrl ? "View PDF Document" : "Expand Reader"}
                    </Button>
                  </div>
                </CardHeader>
                <div className="pt-1">
                  {c.resumeText ? (
                    <StructuredResumeView
                      resumeText={c.resumeText}
                      candidateName={c.name}
                      candidateEmail={c.email}
                      maxHeight="max-h-[560px]"
                    />
                  ) : (
                    <div className="p-6 rounded-[var(--radius-default)] bg-[var(--bg-base)] border border-[var(--border-default)] text-xs text-[var(--text-muted)] text-center">
                      Original PDF resume is attached. Click "View PDF Document" to open the interactive viewer.
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card className="flex-1 min-h-[350px]">
              <CardHeader className="border-b border-[var(--border-default)] pb-4">
                <CardTitle className="flex items-center gap-2">
                   {Icons.calendar} Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative border-l border-[var(--border-default)] ml-3 space-y-8">
                  {timeline.map((ev: any, i: number) => (
                    <div key={i} className="relative pl-6">
                      <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg-surface)]" />
                      <p className="text-sm font-medium text-[var(--text-primary)]">{ev.description}</p>
                      <time className="text-xs font-mono text-[var(--text-subtle)] mt-1 block">
                        {new Date(ev.date).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </time>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                      <EmptyState
                        compact
                        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                        title="No timeline events"
                        description="Activity will appear here as the candidate progresses."
                      />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: AI Panel */}
          <div className="flex flex-col gap-6">
             {renderAIPanel()}
          </div>
        </div>
        {renderOutcomeModal()}
        {renderResumeModal()}
      </div>
    );
  }

  // --- PANEL LAYOUT ---
  return (
    <div className="flex flex-col h-full">
      {/* Profile Header */}
      <div className="p-6 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
        {/* Top: Candidate Identity + Full Profile Link */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <Avatar name={c.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight truncate">{c.name}</h2>
              <p className="text-xs text-[var(--text-muted)] font-medium truncate mt-0.5">{c.job?.title || "General Application"}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="neutral" dot style={{ borderLeft: `3px solid ${stage.color}` }}>{stage.name}</Badge>
                {c.resumeScore !== null && c.resumeScore !== undefined && (
                  <Badge variant={c.resumeScore >= 80 ? "success" : c.resumeScore >= 60 ? "accent" : c.resumeScore >= 40 ? "warning" : "danger"} size="sm">Score {c.resumeScore}/100</Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/candidates/${c.id}`)}
            className="flex items-center gap-1.5 shrink-0 text-xs"
            title="Open Full Profile Page"
          >
            <span>Full Profile</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </Button>
        </div>

        {/* Dedicated Actions Row */}
        <div className="mt-4 pt-3.5 border-t border-[var(--border-divider)] grid grid-cols-1 sm:grid-cols-3 gap-2">
          {stage.type === "STANDARD" ? (
            <Button
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => router.push(`/dashboard/interviews?new=true&candidateId=${c.id}`)}
            >
              Schedule Interview
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => setActiveTab("interviews")}
            >
              View Interviews
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full justify-center text-xs flex items-center gap-1.5"
            onClick={() => {
              setResumeViewMode(c?.resumeUrl ? "pdf" : "text");
              setIsResumeModalOpen(true);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            View Resume
          </Button>

          {canSendOutcomeEmail && (
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-center text-xs flex items-center gap-1.5"
              onClick={handleOpenOutcomeModal}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Decision Email
            </Button>
          )}
        </div>

        {/* Contact info & timestamp */}
        <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
          <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span className="truncate max-w-[220px]">{c.email}</span>
          </a>
          {c.phone && (
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {c.phone}
            </span>
          )}
          <span className="flex items-center gap-1 font-mono">
            Added {getTimeAgo(c.createdAt)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border-default)]">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} size="sm" className="px-6" />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-base)] p-6">

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-5">
            {/* AI Match Score */}
            {renderAIPanel()}

            {/* Candidate metadata */}
            <Card padding="default">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Candidate Info</h3>
              <dl className="flex flex-col gap-2.5">
                {[
                  { label: "Stage",   value: <Badge variant="neutral" size="sm" style={{ borderLeft: `3px solid ${stage.color}` }}>{stage.name}</Badge> },
                  { label: "Applied", value: <span className="font-mono">{new Date(c.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span> },
                  { label: "Email",   value: c.email },
                  { label: "Phone",   value: c.phone || "Not provided" },
                  {
                    label: "Resume",
                    value: (c.resumeUrl || c.resumeText) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setResumeViewMode(c.resumeUrl ? "pdf" : "text");
                          setIsResumeModalOpen(true);
                        }}
                        className="text-[var(--accent)] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        {c.resumeUrl ? "View Original PDF" : "View Extracted Resume"}
                      </button>
                    ) : (
                      <span className="text-[var(--text-muted)] italic">Not provided</span>
                    )
                  },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <dt className="text-xs font-medium text-[var(--text-muted)] w-16 shrink-0">{row.label}</dt>
                    <dd className="text-xs text-[var(--text-secondary)] flex-1">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            {/* Submitted Resume */}
            {(c.resumeUrl || c.resumeText) && (
              <Card padding="default">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    Submitted Resume
                  </h3>
                  <div className="flex items-center gap-2">
                    {c.resumeUrl ? (
                      <Badge variant="success" size="sm">PDF Available</Badge>
                    ) : (
                      <Badge variant="accent" size="sm">Text Extracted</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResumeViewMode(c.resumeUrl ? "pdf" : "text");
                        setIsResumeModalOpen(true);
                      }}
                    >
                      {c.resumeUrl ? "Open PDF Viewer" : "Expand Reader"}
                    </Button>
                  </div>
                </div>
                {c.resumeText ? (
                  <StructuredResumeView
                    resumeText={c.resumeText}
                    candidateName={c.name}
                    candidateEmail={c.email}
                  />
                ) : (
                  <div className="p-4 rounded-[var(--radius-default)] bg-[var(--bg-base)] border border-[var(--border-default)] text-xs text-[var(--text-muted)] text-center">
                    Original PDF is saved. Click "Open PDF Viewer" to inspect full document.
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === "timeline" && renderTimeline()}

        {/* INTERVIEWS TAB */}
        {activeTab === "interviews" && renderInterviewsList()}
      </div>
    
      {renderOutcomeModal()}
      {renderResumeModal()}


    </div>
  );
}
