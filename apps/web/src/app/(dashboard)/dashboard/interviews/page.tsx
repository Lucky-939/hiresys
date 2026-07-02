"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { WorkspaceTemplate } from "@/components/layout/templates";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { Icons } from "@/components/ui/Icons";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ——— Status config ——— */
const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  SCHEDULED:  { label: "Scheduled",  variant: "info"    },
  ACTIVE:     { label: "Live",        variant: "danger"  },
  COMPLETED:  { label: "Completed",  variant: "neutral" },
  CANCELLED:  { label: "Cancelled",  variant: "neutral" },
};

type Interview = {
  id: string; title: string; status: string; createdAt: string;
  createdBy: { name: string };
  candidate?: { name: string; email?: string } | null;
};
type Candidate = { id: string; name: string; email: string };

/* ——— Interview row item ——— */
function InterviewRow({ iv, onAssign, onReport, onJoin, onEnter }: {
  iv: Interview;
  onAssign: () => void;
  onReport: () => void;
  onJoin: () => void;
  onEnter: () => void;
}) {
  const status = STATUS_MAP[iv.status] ?? STATUS_MAP.SCHEDULED;
  const isLive = iv.status === "ACTIVE";
  const isCompleted = iv.status === "COMPLETED";

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors group">
      {/* Date column */}
      <div className="w-16 shrink-0 text-right">
        <span className="text-[var(--text-xs)] text-[var(--text-muted)] tabular-nums">
          {new Date(iv.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Status */}
      <div className="w-24 shrink-0">
        <Badge variant={status.variant} dot size="sm">{status.label}</Badge>
      </div>

      {/* Title + Candidate */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <button
          onClick={isCompleted ? onReport : isLive ? onJoin : onEnter}
          className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors text-left truncate"
        >
          {iv.title}
        </button>
        {iv.candidate ? (
          <div className="flex items-center gap-1.5">
            <Avatar name={iv.candidate.name} size="xs" />
            <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] truncate">{iv.candidate.name}</span>
          </div>
        ) : (
          <button
            onClick={onAssign}
            className="text-[var(--text-xs)] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] text-left"
          >
            + Assign candidate
          </button>
        )}
      </div>

      {/* Creator */}
      <div className="hidden md:block w-28 shrink-0">
        <span className="text-[var(--text-xs)] text-[var(--text-muted)] truncate">
          {iv.createdBy.name.split(" ")[0]}
        </span>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {isCompleted ? (
          <Button variant="outline" size="sm" onClick={onReport}>View Report</Button>
        ) : isLive ? (
          <Button size="sm" onClick={onJoin} className="bg-[var(--danger)] hover:bg-[var(--danger-hover,#DC2626)] text-white border-none">
            Join Live
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onEnter}>Enter Room</Button>
        )}
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  const router = useRouter();
  const { orgs, selectedOrgId, isReady } = useOrganizations();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* Create modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  /* Assign modal */
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningInterview, setAssigningInterview] = useState<Interview | null>(null);
  const [assignCandidateId, setAssignCandidateId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!selectedOrgId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.get(`/interviews/org/${selectedOrgId}`),
      api.get(`/candidates/org/${selectedOrgId}`)
    ])
      .then(([ivRes, candRes]) => {
        setInterviews(ivRes.data.data.sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        setCandidates(candRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  const filtered = useMemo(() =>
    interviews.filter(iv => iv.title.toLowerCase().includes(search.toLowerCase())),
    [interviews, search]
  );

  const upcomingInterviews = filtered.filter(iv => iv.status === "ACTIVE" || iv.status === "SCHEDULED");
  const completedInterviews = filtered.filter(iv => iv.status === "COMPLETED" || iv.status === "CANCELLED");

  async function createInterview() {
    if (!interviewTitle.trim()) { setCreateError("Interview title is required."); return; }
    if (!selectedOrgId) { setCreateError("No organization selected."); return; }
    setCreating(true); setCreateError("");
    try {
      const { data } = await api.post("/interviews", {
        title: interviewTitle.trim(),
        organizationId: selectedOrgId,
        candidateId: selectedCandidate || undefined
      });
      setInterviews(prev => [data.data, ...prev]);
      closeModal();
      toast.success("Interview created");
    } catch (err: unknown) { setCreateError(getErrorMessage(err)); }
    finally { setCreating(false); }
  }

  function closeModal() { setModalOpen(false); setInterviewTitle(""); setSelectedCandidate(""); setCreateError(""); }

  async function assignCandidate() {
    if (!assigningInterview) return;
    setAssigning(true); setAssignError("");
    try {
      await api.patch(`/interviews/${assigningInterview.id}/candidate`, {
        candidateId: assignCandidateId || null
      });
      setInterviews(prev => prev.map(iv =>
        iv.id === assigningInterview.id
          ? { ...iv, candidate: assignCandidateId ? candidates.find(c => c.id === assignCandidateId) : null }
          : iv
      ));
      closeAssignModal();
      toast.success("Candidate assigned");
    } catch (err: unknown) { setAssignError(getErrorMessage(err)); }
    finally { setAssigning(false); }
  }

  function closeAssignModal() { setAssignModalOpen(false); setAssigningInterview(null); setAssignCandidateId(""); setAssignError(""); }

  /* ——— Toolbar ——— */
  const toolbar = (
    <>
      <div className="relative flex-1 max-w-[320px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search interviews..."
          className="h-9 w-full pl-8 pr-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
        <Button size="sm" onClick={() => setModalOpen(true)}>
          New Interview
        </Button>
      </div>
    </>
  );

  /* ——— Table header row ——— */
  const tableHeader = (
    <div className="flex items-center gap-4 px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-default)] rounded-t-[var(--radius-lg)]">
      <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Date</span>
      <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</span>
      <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Interview</span>
      <span className="hidden md:block w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Created by</span>
      <span className="shrink-0 w-[110px] text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Action</span>
    </div>
  );

  /* ——— Content ——— */
  const content = (
    <div className="flex flex-col gap-6">
      {/* Upcoming / Live */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)]">Active & Upcoming</h2>
          <Badge variant="neutral" size="sm">{upcomingInterviews.length}</Badge>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-hidden bg-[var(--bg-surface)]">
          {tableHeader}
          {loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-subtle)]">
                  <div className="w-16 h-3 skeleton rounded" />
                  <div className="w-20 h-5 skeleton rounded-full" />
                  <div className="flex-1 h-4 skeleton rounded" />
                  <div className="w-24 h-8 skeleton rounded-[var(--radius-sm)]" />
                </div>
              ))}
            </div>
          ) : upcomingInterviews.length === 0 ? (
            <EmptyState
              compact
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
              title="No upcoming interviews"
              description="Schedule your first interview to begin technical evaluation."
              action={<Button size="sm" onClick={() => setModalOpen(true)}>Create Interview</Button>}
            />
          ) : (
            upcomingInterviews.map(iv => (
              <InterviewRow
                key={iv.id} iv={iv}
                onAssign={() => { setAssigningInterview(iv); setAssignCandidateId(""); setAssignModalOpen(true); }}
                onReport={() => router.push(`/dashboard/interviews/${iv.id}/report`)}
                onJoin={() => router.push(`/room/${iv.id}`)}
                onEnter={() => router.push(`/room/${iv.id}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* Completed */}
      {completedInterviews.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)]">Completed</h2>
            <Badge variant="neutral" size="sm">{completedInterviews.length}</Badge>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-hidden bg-[var(--bg-surface)]">
            {tableHeader}
            {completedInterviews.map(iv => (
              <InterviewRow
                key={iv.id} iv={iv}
                onAssign={() => { setAssigningInterview(iv); setAssignCandidateId(""); setAssignModalOpen(true); }}
                onReport={() => router.push(`/dashboard/interviews/${iv.id}/report`)}
                onJoin={() => router.push(`/room/${iv.id}`)}
                onEnter={() => router.push(`/room/${iv.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <WorkspaceTemplate
        header={
          <PageHeader
            title="Interviews"
            description="Manage technical screening sessions and review reports."
            actions={<Button size="sm" onClick={() => setModalOpen(true)}>New Interview</Button>}
          />
        }
        toolbar={toolbar}
        content={content}
      />

      {/* Create Modal */}
      <Modal
        open={modalOpen} onClose={closeModal}
        title="New Interview"
        description="Schedule a coding interview session."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
            <Button size="md" onClick={createInterview} loading={creating}>Create Interview</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            autoFocus label="Interview title *"
            value={interviewTitle}
            onChange={e => { setInterviewTitle(e.target.value); setCreateError(""); }}
            onKeyDown={e => { if (e.key === "Enter") createInterview(); }}
            placeholder="e.g. Frontend Engineer — Round 1"
            error={createError}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">Link Candidate (Optional)</label>
            <select
              value={selectedCandidate}
              onChange={e => setSelectedCandidate(e.target.value)}
              className="h-10 w-full px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-sm)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
            >
              <option value="">— No candidate —</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal
        open={assignModalOpen} onClose={closeAssignModal}
        title="Assign Candidate"
        description={`Link a candidate to "${assigningInterview?.title}".`}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeAssignModal}>Cancel</Button>
            <Button size="md" onClick={assignCandidate} loading={assigning}>Save</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">Select Candidate</label>
            <select
              value={assignCandidateId}
              onChange={e => setAssignCandidateId(e.target.value)}
              className="h-10 w-full px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-sm)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
            >
              <option value="">— No candidate —</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          </div>
          {assignError && <p className="text-[var(--text-xs)] text-[var(--danger-text)]">{assignError}</p>}
        </div>
      </Modal>
    </>
  );
}
