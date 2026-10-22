"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
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
import { cn, hasCompletedInterview } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";
import { toast } from "sonner";
import { CandidateProfileContent } from "@/components/candidates/CandidateProfileContent";

function getTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* â€”â€”â€” Compact Candidate Card (84px) â€”â€”â€” */
function CandidateListItem({
  candidate, isSelected, onClick
}: { candidate: any; isSelected: boolean; onClick: () => void }) {
  const stage = candidate.pipelineStage || { name: "Unknown", color: "#666", type: "STANDARD" };
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group",
        "h-[84px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] rounded-[var(--radius-default)]",
        isSelected
          ? "bg-[var(--accent-muted)]"
          : "hover:bg-[var(--bg-elevated)] border-b border-[var(--border-divider)]"
      )}
      aria-selected={isSelected}
    >
      <Avatar name={candidate.name} size="md" />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-sm font-semibold leading-tight truncate group-hover:text-[var(--accent)] transition-colors",
            isSelected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
          )}>
            {candidate.name}
          </span>
          <span className="text-[11px] text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0 flex items-center gap-0.5">
            Full View &rarr;
          </span>
        </div>
        <span className="text-xs text-[var(--text-muted)] truncate">
          {candidate.job?.title || "General Application"}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="neutral" size="sm" style={{ borderLeft: `3px solid ${stage.color}` }}>{stage.name}</Badge>
          {candidate.latestScore !== null && candidate.latestScore !== undefined && (
            <span className={cn(
              "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded",
              candidate.latestScore >= 80 ? "bg-[var(--accent)]/10 text-[var(--accent)]" :
              candidate.latestScore >= 60 ? "bg-[var(--accent)]/10 text-[var(--accent)]" :
              candidate.latestScore >= 40 ? "bg-[var(--danger)]/10 text-[var(--danger)]" :
                                            "bg-[var(--danger)]/10 text-[var(--danger)]"
            )}>
              {candidate.latestScore}%
            </span>
          )}
        </div>
      </div>
      <div className="text-xs font-mono text-[var(--text-muted)] shrink-0 text-right">
        {getTimeAgo(candidate.createdAt)}
      </div>
    </button>
  );
}



/* â€”â€”â€” MAIN PAGE â€”â€”â€” */
export default function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgs, selectedOrgId, isReady } = useOrganizations();

  const [candidates, setCandidates] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* Add Candidate Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobId, setJobId] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);

  /* Open add modal from URL param */
  useEffect(() => {
    if (searchParams.get("new") === "true") setModalOpen(true);
  }, [searchParams]);

  /* Load jobs for the modal */
  useEffect(() => {
    if (!selectedOrgId || !modalOpen) return;
    api.get(`/jobs/org/${selectedOrgId}`)
      .then(res => setJobs(res.data.data || []))
      .catch(console.error);
  }, [selectedOrgId, modalOpen]);

  /* Load candidates and stages */
  useEffect(() => {
    if (!isReady || !selectedOrgId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.get(`/candidates/org/${selectedOrgId}`),
      api.get(`/organizations/${selectedOrgId}/stages`)
    ])
      .then(([candRes, stagesRes]) => {
        const sorted = (candRes.data.data || []).sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setCandidates(sorted);
        setStages(stagesRes.data.data || []);
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
        organizationId: selectedOrgId, name: name.trim(), email: email.trim(), jobId: jobId || undefined
      });
      const newC = res.data.data;
      // We need to append the job to the newly created candidate so the UI updates correctly
      if (jobId) {
        newC.job = jobs.find(j => j.id === jobId);
      }
      setCandidates(prev => [newC, ...prev]);
      setSelectedId(newC.id);
      setModalOpen(false); setName(""); setEmail(""); setJobId("");
      toast.success("Candidate added");
    } catch (err: unknown) { setFormError(getErrorMessage(err)); }
    finally { setCreating(false); }
  }

  /* Filtered list */
  const filtered = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || (c.job?.title || "").toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === "ALL" || c.stageId === stageFilter;
      return matchSearch && matchStage;
    });
  }, [candidates, search, stageFilter]);

  /* â€”â€”â€” Left list panel â€”â€”â€” */
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
            className="h-8 w-full pl-8 pr-3 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {[{ id: "ALL", name: "All" }, ...stages].map(s => (
            <button
              key={s.id}
              onClick={() => setStageFilter(s.id)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0",
                stageFilter === s.id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="px-4 py-2 border-b border-[var(--border-divider)] bg-[var(--bg-surface)]">
        <span className="text-xs text-[var(--text-muted)]">
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
              onClick={() => router.push(`/dashboard/candidates/${c.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );

  /* â€”â€”â€” Right detail panel â€”â€”â€” */
  const detailPanel = (
    <div className="h-full flex flex-col">
      {selectedId ? (
        <CandidateProfileContent candidateId={selectedId} layout="panel" />
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
            backHref="/dashboard"
            backLabel="Back to Dashboard"
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
          <Select label="Job (Optional)" value={jobId} onChange={e => setJobId(e.target.value)}>
            <option value="">General Application</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </Select>
          {formError && <p className="text-xs text-[var(--danger-text)]">{formError}</p>}
        </div>
      </Modal>
    </>
  );
}
