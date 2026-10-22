"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkspaceTemplate } from "@/components/layout/templates";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ——— Status config ——— */
const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  SCHEDULED:  { label: "Scheduled",  variant: "info"    },
  ACTIVE:     { label: "Live",       variant: "live"    },
  COMPLETED:  { label: "Completed",  variant: "neutral" },
  CANCELLED:  { label: "Cancelled",  variant: "neutral" },
};

type Interview = {
  id: string; title: string; status: string; createdAt: string;
  scheduledAt?: string | null;
  createdBy: { name: string };
  candidate?: { name: string; email?: string } | null;
  interviewer?: { id?: string; name: string; email?: string } | null;
  candidateInviteFailed?: boolean;
  interviewerInviteFailed?: boolean;
};
type Candidate = { id: string; name: string; email: string };
type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

/* ——— Interview row item ——— */
function InterviewRow({
  iv,
  onAssignCandidate,
  onAssignInterviewer,
  onReport,
  onJoin,
  onEnter,
  onResend,
  onCopyCandidateLink,
  isResending,
  canManage,
}: {
  iv: Interview;
  onAssignCandidate: () => void;
  onAssignInterviewer: () => void;
  onReport: () => void;
  onJoin: () => void;
  onEnter: () => void;
  onResend: () => void;
  onCopyCandidateLink: () => void;
  isResending: boolean;
  canManage: boolean;
}) {
  const status = STATUS_MAP[iv.status] ?? STATUS_MAP.SCHEDULED;
  const isLive = iv.status === "ACTIVE";
  const isCompleted = iv.status === "COMPLETED";

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-divider)] hover:bg-[var(--bg-elevated)] transition-colors group">
      {/* Date column */}
      <div className="w-16 shrink-0 text-right">
        <span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
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
          className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors text-left truncate"
        >
          {iv.title}
        </button>
        {iv.candidate ? (
          <div
            className={cn("flex items-center gap-1.5", canManage && "cursor-pointer hover:opacity-80 transition-opacity")}
            onClick={canManage ? onAssignCandidate : undefined}
            title={canManage ? "Click to change candidate" : undefined}
          >
            <Avatar name={iv.candidate.name} size="xs" />
            <span className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] truncate">
              {iv.candidate.name}
            </span>
          </div>
        ) : canManage ? (
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-[var(--bg-elevated)] w-max border-dashed text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[11px]"
            onClick={onAssignCandidate}
          >
            + Assign candidate
          </Badge>
        ) : (
          <span className="text-xs text-[var(--text-muted)] italic">No candidate</span>
        )}
      </div>

      {/* Interviewer */}
      <div className="hidden lg:block w-36 shrink-0">
        {iv.interviewer ? (
          <div
            className={cn("flex items-center gap-1.5", canManage && "cursor-pointer hover:opacity-80 transition-opacity")}
            onClick={canManage ? onAssignInterviewer : undefined}
            title={canManage ? "Click to change interviewer" : undefined}
          >
            <Avatar name={iv.interviewer.name} size="xs" />
            <span className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] truncate">
              {iv.interviewer.name}
            </span>
          </div>
        ) : canManage ? (
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-[var(--bg-elevated)] w-max border-dashed text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-[11px]"
            onClick={onAssignInterviewer}
          >
            + Interviewer
          </Badge>
        ) : (
          <span className="text-xs text-[var(--text-muted)] italic">Unassigned</span>
        )}
      </div>

      {/* Creator */}
      <div className="hidden md:block w-24 shrink-0">
        <span className="text-xs text-[var(--text-muted)] truncate">
          {iv.createdBy.name.split(" ")[0]}
        </span>
      </div>

      {/* Action */}
      <div className="shrink-0 flex items-center gap-2">
        {iv.candidate && !isCompleted && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyCandidateLink}
            className="text-xs flex items-center gap-1.5"
            title="Copy candidate room link or open access details"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Candidate Link</span>
          </Button>
        )}
        {(iv.candidateInviteFailed || iv.interviewerInviteFailed) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResend}
            disabled={isResending}
            className="text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            {isResending ? "Resending..." : "Resend Invite"}
          </Button>
        )}
        {isCompleted ? (
          <Button variant="outline" size="sm" onClick={onReport}>View Report</Button>
        ) : isLive ? (
          <Button size="sm" onClick={onJoin}>
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
  const searchParams = useSearchParams();
  const { orgs, selectedOrgId, isReady } = useOrganizations();
  const selectedOrg = useMemo(() => orgs.find(o => o.id === selectedOrgId), [orgs, selectedOrgId]);
  const isInterviewer = selectedOrg?.role === "INTERVIEWER";
  const canManage = !isInterviewer;

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  /* Team members & candidates */
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  /* Create modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedInterviewer, setSelectedInterviewer] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  /* Assign Candidate modal */
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningInterview, setAssigningInterview] = useState<Interview | null>(null);
  const [assignCandidateId, setAssignCandidateId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  /* Assign Interviewer modal */
  const [assignInterviewerModalOpen, setAssignInterviewerModalOpen] = useState(false);
  const [assigningInterviewerIv, setAssigningInterviewerIv] = useState<Interview | null>(null);
  const [assignInterviewerId, setAssignInterviewerId] = useState("");
  const [assigningInterviewer, setAssigningInterviewer] = useState(false);
  const [assignInterviewerError, setAssignInterviewerError] = useState("");

  /* Share / Copy Candidate Link modal */
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    interview: Interview | null;
    candidateUrl: string;
    loading: boolean;
  }>({ open: false, interview: null, candidateUrl: "", loading: false });

  async function handleCopyCandidateLink(iv: Interview) {
    setShareModal({ open: true, interview: iv, candidateUrl: "", loading: true });
    try {
      const { data } = await api.get(`/interviews/${iv.id}/candidate-link`);
      const roomUrl = data?.data?.roomUrl || `${window.location.origin}/room/${iv.id}?token=${data?.data?.token}`;
      setShareModal(prev => ({ ...prev, candidateUrl: roomUrl, loading: false }));
      await navigator.clipboard.writeText(roomUrl);
      toast.success(`Direct join link for ${iv.candidate?.name || "candidate"} copied!`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setShareModal(prev => ({ ...prev, open: false, loading: false }));
    }
  }

  async function handleResendInvite(interviewId: string) {
    setResendingId(interviewId);
    try {
      const { data } = await api.post(`/interviews/${interviewId}/resend-invite`);
      if (data.warning) {
        toast.warning(data.warning, { duration: 6000 });
      } else {
        toast.success(data.message || "Interview invite resent successfully!");
      }
      if (data.data) {
        setInterviews(prev => prev.map(iv => iv.id === interviewId ? { ...iv, ...data.data } : iv));
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setResendingId(null);
    }
  }

  useEffect(() => {
    if (!isReady) return;
    if (!selectedOrgId) { setLoading(false); return; }
    setLoading(true);
    const promises: Promise<any>[] = [api.get(`/interviews/org/${selectedOrgId}`)];
    if (!isInterviewer) {
      promises.push(api.get(`/candidates/org/${selectedOrgId}`));
      promises.push(api.get(`/organizations/${selectedOrgId}/members`));
    }
    
    Promise.all(promises)
      .then(([ivRes, candRes, memRes]) => {
        setInterviews(ivRes.data.data.sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        if (candRes) {
          setCandidates(candRes.data.data);
        }
        if (memRes) {
          setMembers(memRes.data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady, isInterviewer]);

  useEffect(() => {
    if (searchParams?.get("new") === "true") {
      setModalOpen(true);
      const cId = searchParams.get("candidateId");
      if (cId) setSelectedCandidate(cId);
      router.replace("/dashboard/interviews");
    }
  }, [searchParams, router]);

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
        candidateId: selectedCandidate || undefined,
        interviewerId: selectedInterviewer || undefined,
      });
      setInterviews(prev => [data.data, ...prev]);
      closeModal();
      if (data.warning) {
        toast.warning(data.warning, { duration: 7000 });
      } else {
        toast.success("Interview created");
      }
    } catch (err: unknown) { setCreateError(getErrorMessage(err)); }
    finally { setCreating(false); }
  }

  function closeModal() {
    setModalOpen(false);
    setInterviewTitle("");
    setSelectedCandidate("");
    setSelectedInterviewer("");
    setCreateError("");
  }

  function openAssignCandidate(iv: Interview) {
    setAssigningInterview(iv);
    const matched = candidates.find(c => c.name === iv.candidate?.name || (iv.candidate?.email && c.email === iv.candidate.email));
    setAssignCandidateId(matched?.id || "");
    setAssignError("");
    setAssignModalOpen(true);
  }

  function closeAssignModal() {
    setAssignModalOpen(false);
    setAssigningInterview(null);
    setAssignCandidateId("");
    setAssignError("");
  }

  async function assignCandidate() {
    if (!assigningInterview) return;
    setAssigning(true); setAssignError("");
    try {
      const { data } = await api.patch(`/interviews/${assigningInterview.id}/candidate`, {
        candidateId: assignCandidateId || null
      });
      setInterviews(prev => prev.map(iv =>
        iv.id === assigningInterview.id
          ? { ...iv, candidate: assignCandidateId ? candidates.find(c => c.id === assignCandidateId) : null }
          : iv
      ));
      closeAssignModal();
      if (data.warning) {
        toast.warning(data.warning, { duration: 6000 });
      } else {
        toast.success(assignCandidateId ? "Candidate assigned" : "Candidate unassigned");
      }
    } catch (err: unknown) { setAssignError(getErrorMessage(err)); }
    finally { setAssigning(false); }
  }

  function openAssignInterviewer(iv: Interview) {
    setAssigningInterviewerIv(iv);
    const matched = members.find(m => m.user.name === iv.interviewer?.name || (iv.interviewer?.email && m.user.email === iv.interviewer.email));
    setAssignInterviewerId(matched?.user.id || "");
    setAssignInterviewerError("");
    setAssignInterviewerModalOpen(true);
  }

  function closeAssignInterviewerModal() {
    setAssignInterviewerModalOpen(false);
    setAssigningInterviewerIv(null);
    setAssignInterviewerId("");
    setAssignInterviewerError("");
  }

  async function assignInterviewer() {
    if (!assigningInterviewerIv) return;
    setAssigningInterviewer(true);
    setAssignInterviewerError("");
    try {
      const { data } = await api.patch(`/interviews/${assigningInterviewerIv.id}/interviewer`, {
        interviewerId: assignInterviewerId || null
      });
      const selectedMember = members.find(m => m.user.id === assignInterviewerId);
      setInterviews(prev => prev.map(iv =>
        iv.id === assigningInterviewerIv.id
          ? {
              ...iv,
              interviewer: selectedMember
                ? { id: selectedMember.user.id, name: selectedMember.user.name, email: selectedMember.user.email }
                : null
            }
          : iv
      ));
      closeAssignInterviewerModal();
      if (data.warning) {
        toast.warning(data.warning, { duration: 6000 });
      } else {
        toast.success(assignInterviewerId ? "Interviewer assigned and invite sent!" : "Interviewer unassigned");
      }
    } catch (err: unknown) {
      setAssignInterviewerError(getErrorMessage(err));
    } finally {
      setAssigningInterviewer(false);
    }
  }

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
          className="h-9 w-full pl-8 pr-3 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
      </div>
    </>
  );

  /* ——— Table header row ——— */
  const tableHeader = (
    <div className="flex items-center gap-4 px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-default)] rounded-t-[var(--radius-default)]">
      <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Date</span>
      <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</span>
      <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Interview & Candidate</span>
      <span className="hidden lg:block w-36 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Interviewer</span>
      <span className="hidden md:block w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Created by</span>
      <span className="shrink-0 w-[120px] text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Action</span>
    </div>
  );

  /* ——— Content ——— */
  const content = (
    <div className="flex flex-col gap-6">
      {/* Upcoming / Live */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Active & Upcoming</h2>
          <Badge variant="neutral" size="sm">{upcomingInterviews.length}</Badge>
        </div>
        <div className="rounded-[var(--radius-default)] border border-[var(--border-default)] overflow-hidden bg-[var(--bg-surface)]">
          {tableHeader}
          {loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-divider)]">
                  <div className="w-16 h-3 skeleton rounded" />
                  <div className="w-20 h-5 skeleton rounded-full" />
                  <div className="flex-1 h-4 skeleton rounded" />
                  <div className="w-24 h-8 skeleton rounded-[var(--radius-default)]" />
                </div>
              ))}
            </div>
          ) : upcomingInterviews.length === 0 ? (
            <EmptyState
              compact
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
              title="No upcoming interviews"
              description="Schedule your first interview to begin technical evaluation."
              action={!isInterviewer ? <Button size="sm" onClick={() => setModalOpen(true)}>Create Interview</Button> : undefined}
            />
          ) : (
            upcomingInterviews.map(iv => (
              <InterviewRow
                key={iv.id}
                iv={iv}
                onAssignCandidate={() => openAssignCandidate(iv)}
                onAssignInterviewer={() => openAssignInterviewer(iv)}
                onReport={() => router.push(`/dashboard/interviews/${iv.id}/report`)}
                onJoin={() => router.push(`/room/${iv.id}`)}
                onEnter={() => router.push(`/room/${iv.id}`)}
                onResend={() => handleResendInvite(iv.id)}
                onCopyCandidateLink={() => handleCopyCandidateLink(iv)}
                isResending={resendingId === iv.id}
                canManage={canManage}
              />
            ))
          )}
        </div>
      </div>

      {/* Completed */}
      {completedInterviews.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Completed</h2>
            <Badge variant="neutral" size="sm">{completedInterviews.length}</Badge>
          </div>
          <div className="rounded-[var(--radius-default)] border border-[var(--border-default)] overflow-hidden bg-[var(--bg-surface)]">
            {tableHeader}
            {completedInterviews.map(iv => (
              <InterviewRow
                key={iv.id}
                iv={iv}
                onAssignCandidate={() => openAssignCandidate(iv)}
                onAssignInterviewer={() => openAssignInterviewer(iv)}
                onReport={() => router.push(`/dashboard/interviews/${iv.id}/report`)}
                onJoin={() => router.push(`/room/${iv.id}`)}
                onEnter={() => router.push(`/room/${iv.id}`)}
                onResend={() => handleResendInvite(iv.id)}
                onCopyCandidateLink={() => handleCopyCandidateLink(iv)}
                isResending={resendingId === iv.id}
                canManage={canManage}
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
            backHref="/dashboard"
            backLabel="Back to Dashboard"
            actions={!isInterviewer ? <Button size="sm" onClick={() => setModalOpen(true)}>New Interview</Button> : undefined}
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
          <Select
            label="Link Candidate (Optional)"
            value={selectedCandidate}
            onChange={e => setSelectedCandidate(e.target.value)}
          >
            <option value="">— No candidate —</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
          </Select>
          <Select
            label="Assign Interviewer (Optional)"
            value={selectedInterviewer}
            onChange={e => setSelectedInterviewer(e.target.value)}
          >
            <option value="">— No interviewer assigned —</option>
            {members.map(m => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name} ({m.user.email}) — {m.role}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* Assign Candidate Modal */}
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
          <Select
            label="Select Candidate"
            value={assignCandidateId}
            onChange={e => setAssignCandidateId(e.target.value)}
          >
            <option value="">— No candidate —</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
          </Select>
          {assignError && <p className="text-xs text-[var(--danger-text)]">{assignError}</p>}
        </div>
      </Modal>

      {/* Assign Interviewer Modal */}
      <Modal
        open={assignInterviewerModalOpen} onClose={closeAssignInterviewerModal}
        title="Assign Interviewer"
        description={`Assign a team member to conduct "${assigningInterviewerIv?.title}".`}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeAssignInterviewerModal}>Cancel</Button>
            <Button size="md" onClick={assignInterviewer} loading={assigningInterviewer}>Save</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Select Interviewer"
            value={assignInterviewerId}
            onChange={e => setAssignInterviewerId(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {members.map(m => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name} ({m.user.email}) — {m.role}
              </option>
            ))}
          </Select>
          {assignInterviewerError && <p className="text-xs text-[var(--danger-text)]">{assignInterviewerError}</p>}
        </div>
      </Modal>

      {/* Candidate Direct Access Modal */}
      <Modal
        open={shareModal.open}
        onClose={() => setShareModal(prev => ({ ...prev, open: false }))}
        title="Candidate Direct Interview Link"
        description="Share this direct access link with the candidate. Opening this link immediately signs them in and places them directly into the live coding room."
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              disabled={shareModal.loading}
              onClick={() => {
                window.open(shareModal.candidateUrl, "_blank");
              }}
            >
              Open in New Window ↗
            </Button>
            <Button
              size="sm"
              disabled={shareModal.loading}
              onClick={() => {
                navigator.clipboard.writeText(shareModal.candidateUrl);
                toast.success("Candidate link copied to clipboard!");
                setShareModal(prev => ({ ...prev, open: false }));
              }}
            >
              Copy Link & Close
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Direct Join Link for {shareModal.interview?.candidate?.name || "Candidate"}
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareModal.loading ? "Generating secure access token..." : shareModal.candidateUrl}
                className="h-9 flex-1 px-3 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] font-mono"
              />
              <Button
                size="sm"
                disabled={shareModal.loading}
                onClick={() => {
                  navigator.clipboard.writeText(shareModal.candidateUrl);
                  toast.success("Candidate link copied to clipboard!");
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="p-3.5 rounded-[var(--radius-default)] bg-[var(--accent)]/5 border border-[var(--accent)]/20 text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <span>⚡</span> No Login or Password Required
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed">
              This link contains a pre-authenticated candidate session token for <strong className="text-[var(--text-primary)]">{shareModal.interview?.candidate?.name}</strong> ({shareModal.interview?.candidate?.email}). You can paste this link into WhatsApp, Slack, Gmail, or an Incognito window to join immediately.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
