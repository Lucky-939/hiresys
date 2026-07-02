"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { ActivityTimeline } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CandidateCardSkeleton } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader, ScoreBar, AIMatchBar } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { MasterDetailTemplate } from "@/components/layout/templates";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";
import { toast } from "sonner";

/* ——— Stage config ——— */
const STAGE_MAP: Record<string, { label: string; variant: any }> = {
  APPLIED:      { label: "Applied",    variant: "outline"     },
  SCREENING:    { label: "Screening",  variant: "warning"     },
  INTERVIEWING: { label: "Interview",  variant: "accent"      },
  OFFER:        { label: "Offer",      variant: "success"     },
  HIRED:        { label: "Hired",      variant: "success"     },
  REJECTED:     { label: "Rejected",   variant: "danger"      },
};

function getTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ——— Compact Candidate Card (84px) ——— */
function CandidateListItem({
  candidate, isSelected, onClick
}: { candidate: any; isSelected: boolean; onClick: () => void }) {
  const stage = STAGE_MAP[candidate.stage] ?? STAGE_MAP.APPLIED;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] transition-colors",
        "h-[84px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]",
        isSelected
          ? "bg-[var(--accent-muted)] border-l-2 border-l-[var(--accent)]"
          : "hover:bg-[var(--bg-elevated)]"
      )}
      aria-selected={isSelected}
    >
      <Avatar name={candidate.name} size="md" />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className={cn(
          "text-[var(--text-sm)] font-semibold leading-tight truncate",
          isSelected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
        )}>
          {candidate.name}
        </span>
        <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] truncate">
          {candidate.role || "General Application"}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant={stage.variant} size="sm">{stage.label}</Badge>
          {candidate.latestScore && (
            <span className="text-[10px] font-bold text-[var(--accent)] tabular-nums">{candidate.latestScore}%</span>
          )}
        </div>
      </div>
      <div className="text-[var(--text-xs)] text-[var(--text-muted)] shrink-0 text-right">
        {getTimeAgo(candidate.createdAt)}
      </div>
    </button>
  );
}

/* ——— Candidate Detail Panel ——— */
function CandidateDetailPanel({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    api.get(`/candidates/${candidateId}`)
      .then(r => setData(r.data.data))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [candidateId]);

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Skeleton width={64} height={64} rounded="full" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton width="50%" height={18} />
            <Skeleton width="35%" height={13} />
          </div>
        </div>
        <Skeleton height={120} rounded="lg" />
        <Skeleton height={80} rounded="lg" />
        <Skeleton height={200} rounded="lg" />
      </div>
    );
  }

  if (!data) return null;

  const c = data.candidate;
  const timeline = data.timeline ?? [];
  const stage = STAGE_MAP[c.stage] ?? STAGE_MAP.APPLIED;

  const tabs = [
    { id: "overview",   label: "Overview"   },
    { id: "timeline",   label: "Timeline", count: timeline.length },
    { id: "interviews", label: "Interviews" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Profile Header */}
      <div className="p-6 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex items-start gap-4">
          <Avatar name={c.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[var(--text-lg)] font-bold text-[var(--text-primary)] leading-tight">{c.name}</h2>
            <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-0.5">{c.role || "General Application"}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={stage.variant} dot>{stage.label}</Badge>
              {c.resumeScore && (
                <Badge variant="accent" size="sm">Score {c.resumeScore}/100</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={() => router.push("/dashboard/interviews/new")}>
              Schedule Interview
            </Button>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            {c.email}
          </a>
          {c.phone && (
            <span className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--text-tertiary)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {c.phone}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--text-muted)]">
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
            {/* AI Match Score (horizontal bar — spec vol 7.14) */}
            {c.resumeScore ? (
              <Card padding="default">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">AI Resume Analysis</h3>
                  <Badge variant="accent" size="sm">AI</Badge>
                </div>
                <AIMatchBar score={c.resumeScore} label="Overall Match" />
                <div className="flex gap-2 mt-4">
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setAnalyzing(true);
                    try {
                      const formData = new FormData();
                      formData.append("resume", file); formData.append("candidateId", candidateId);
                      const res = await api.post("/ai/resume/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
                      const jobId = res.data.jobId;
                      const poll = setInterval(async () => {
                        const s = await api.get(`/ai/resume/status/${jobId}`);
                        if (s.data.status === "completed") { clearInterval(poll); setAnalyzing(false); const r = await api.get(`/candidates/${candidateId}`); setData(r.data.data); }
                        else if (s.data.status === "failed") { clearInterval(poll); setAnalyzing(false); toast.error("Analysis failed"); }
                      }, 2000);
                    } catch(e: unknown) { setAnalyzing(false); toast.error(getErrorMessage(e)); }
                  }} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} loading={analyzing}>
                    {analyzing ? "Analyzing..." : "Re-analyze Resume"}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card padding="default">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Resume Analysis</h3>
                </div>
                <EmptyState
                  compact
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                  title="No resume analyzed"
                  description="Upload a resume to get an instant AI score and skill analysis."
                  action={
                    <>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        setAnalyzing(true);
                        try {
                          const formData = new FormData();
                          formData.append("resume", file); formData.append("candidateId", candidateId);
                          const res = await api.post("/ai/resume/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
                          const jobId = res.data.jobId;
                          const poll = setInterval(async () => {
                            const s = await api.get(`/ai/resume/status/${jobId}`);
                            if (s.data.status === "completed") { clearInterval(poll); setAnalyzing(false); const r = await api.get(`/candidates/${candidateId}`); setData(r.data.data); }
                            else if (s.data.status === "failed") { clearInterval(poll); setAnalyzing(false); toast.error("Analysis failed"); }
                          }, 2000);
                        } catch(e: unknown) { setAnalyzing(false); toast.error(getErrorMessage(e)); }
                      }} />
                      <Button size="sm" onClick={() => fileInputRef.current?.click()} loading={analyzing}>
                        Upload Resume
                      </Button>
                    </>
                  }
                />
              </Card>
            )}

            {/* Candidate metadata */}
            <Card padding="default">
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-3">Candidate Info</h3>
              <dl className="flex flex-col gap-2.5">
                {[
                  { label: "Stage",   value: <Badge variant={stage.variant} size="sm">{stage.label}</Badge> },
                  { label: "Applied", value: new Date(c.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) },
                  { label: "Email",   value: c.email },
                  { label: "Phone",   value: c.phone || "—" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <dt className="text-[var(--text-xs)] font-medium text-[var(--text-muted)] w-16 shrink-0">{row.label}</dt>
                    <dd className="text-[var(--text-xs)] text-[var(--text-secondary)] flex-1">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === "timeline" && (
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
        )}

        {/* INTERVIEWS TAB */}
        {activeTab === "interviews" && (
          <EmptyState
            compact
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            title="No interviews yet"
            description="Schedule an interview to begin evaluating this candidate."
            action={
              <Button size="sm" onClick={() => router.push("/dashboard/interviews/new")}>
                Schedule Interview
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

/* ——— MAIN PAGE ——— */
export default function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgs, selectedOrgId, isReady } = useOrganizations();

  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* Add Candidate Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  /* Open add modal from URL param */
  useEffect(() => {
    if (searchParams.get("new") === "true") setModalOpen(true);
  }, [searchParams]);

  /* Load candidates */
  useEffect(() => {
    if (!isReady || !selectedOrgId) { setLoading(false); return; }
    setLoading(true);
    api.get(`/candidates/org/${selectedOrgId}`)
      .then(res => {
        const sorted = (res.data.data || []).sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setCandidates(sorted);
        if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0].id);
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  async function handleAddCandidate() {
    if (!name.trim() || !email.trim()) { setFormError("Name and email are required."); return; }
    if (!selectedOrgId) { setFormError("No organization selected."); return; }
    setCreating(true); setFormError("");
    try {
      const res = await api.post("/candidates", {
        organizationId: selectedOrgId, name: name.trim(), email: email.trim(), role: role.trim() || undefined
      });
      const newC = res.data.data;
      setCandidates(prev => [newC, ...prev]);
      setSelectedId(newC.id);
      setModalOpen(false); setName(""); setEmail(""); setRole("");
      toast.success("Candidate added");
    } catch (err: unknown) { setFormError(getErrorMessage(err)); }
    finally { setCreating(false); }
  }

  /* Filtered list */
  const filtered = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || (c.role || "").toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === "ALL" || c.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [candidates, search, stageFilter]);

  /* ——— Left list panel ——— */
  const listPanel = (
    <div className="flex flex-col h-full">
      {/* Search + filter toolbar */}
      <div className="p-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search candidates..."
            className="h-8 w-full pl-8 pr-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-xs)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {["ALL", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "HIRED"].map(s => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0",
                stageFilter === s
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {s === "ALL" ? "All" : STAGE_MAP[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <span className="text-[var(--text-xs)] text-[var(--text-muted)]">
          {loading ? "Loading..." : `${filtered.length} candidate${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <CandidateCardSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            title={search ? "No results" : "No candidates"}
            description={search ? "Try a different search term." : "Add your first candidate to get started."}
            action={!search ? <Button size="sm" onClick={() => setModalOpen(true)}>Add Candidate</Button> : undefined}
          />
        ) : (
          filtered.map(c => (
            <CandidateListItem
              key={c.id}
              candidate={c}
              isSelected={selectedId === c.id}
              onClick={() => setSelectedId(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );

  /* ——— Right detail panel ——— */
  const detailPanel = (
    <div className="h-full flex flex-col">
      {selectedId ? (
        <CandidateDetailPanel candidateId={selectedId} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            title="Select a candidate"
            description="Choose a candidate from the list to view their profile."
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      <MasterDetailTemplate
        header={
          <PageHeader
            title="Candidates"
            description="Manage your talent pipeline and evaluate applicants."
            actions={
              <>
                {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
                <Button variant="outline" size="sm" onClick={async () => {
                  if (!selectedOrgId) return;
                  try {
                    const res = await api.get(`/candidates/org/${selectedOrgId}/export`, { responseType: "blob" });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement("a"); a.href = url; a.setAttribute("download", `candidates-${selectedOrgId}.csv`);
                    document.body.appendChild(a); a.click(); a.parentNode?.removeChild(a);
                  } catch(e) { console.error(e); }
                }}>Export CSV</Button>
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  Add Candidate
                </Button>
              </>
            }
          />
        }
        listPanel={listPanel}
        detailPanel={detailPanel}
      />

      {/* Add Candidate Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFormError(""); }}
        title="Add Candidate"
        description="Manually add a new candidate to your pipeline."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="md" onClick={handleAddCandidate} loading={creating}>Add Candidate</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Full Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" autoFocus />
          <Input label="Email Address *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
          <Input label="Role Applied (Optional)" value={role} onChange={e => setRole(e.target.value)} placeholder="Senior Frontend Engineer" />
          {formError && <p className="text-[var(--text-xs)] text-[var(--danger-text)]">{formError}</p>}
        </div>
      </Modal>
    </>
  );
}
