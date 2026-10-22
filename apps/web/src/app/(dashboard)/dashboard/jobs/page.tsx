"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceTemplate } from "@/components/layout/templates";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Job = {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  status: string;
  createdAt: string;
  _count: { candidates: number };
};

export default function JobsPage() {
  const { user } = useAuthStore();
  const { orgs, selectedOrgId, isReady } = useOrganizations();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: "DELETE" | "CLOSE" | null; jobId: string | null; candidatesCount?: number }>({ open: false, type: null, jobId: null });

  useEffect(() => {
    if (!isReady || !selectedOrgId) { if (isReady && !selectedOrgId) setLoading(false); return; }
    setLoading(true);
    api.get(`/jobs/org/${selectedOrgId}`)
      .then(res => {
        setJobs(res.data.data);
      })
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  async function handleCreateJob() {
    if (!title.trim()) { setFormError("Job title is required."); return; }
    if (!description.trim()) { setFormError("Job description is required."); return; }
    setCreating(true); setFormError("");
    try {
      const res = await api.post("/jobs", {
        organizationId: selectedOrgId,
        title: title.trim(),
        department: department.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim(),
        status: "DRAFT"
      });
      const newJob = { ...res.data.data, _count: { candidates: 0 } };
      setJobs(prev => [newJob, ...prev]);
      closeModal();
      toast.success("Job created as Draft. Click 'Publish' when ready to accept applications.");
    } catch (err: unknown) { setFormError(getErrorMessage(err)); }
    finally { setCreating(false); }
  }

  async function handleDeleteJob(jobId: string, candidatesCount: number) {
    if (candidatesCount > 0) {
      toast.error("Cannot delete a job with active candidates. Close it instead.");
      return;
    }
    setConfirmModal({ open: true, type: "DELETE", jobId, candidatesCount });
  }

  async function confirmDeleteJob() {
    if (!confirmModal.jobId) return;
    try {
      await api.delete(`/jobs/${confirmModal.jobId}`);
      setJobs(prev => prev.filter(j => j.id !== confirmModal.jobId));
      toast.success("Job deleted");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setConfirmModal({ open: false, type: null, jobId: null }); }
  }

  async function handlePublishJob(jobId: string) {
    try {
      await api.patch(`/jobs/${jobId}`, { status: "OPEN" });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "OPEN" } : j));
      toast.success("Job published! It is now open for public applications.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleCopyLink(jobId: string) {
    const publicUrl = `${window.location.origin}/jobs/${jobId}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Public link copied to clipboard");
  }

  async function handleCloseJob(jobId: string) {
    setConfirmModal({ open: true, type: "CLOSE", jobId });
  }

  async function confirmCloseJob() {
    if (!confirmModal.jobId) return;
    try {
      await api.patch(`/jobs/${confirmModal.jobId}`, { status: "CLOSED" });
      setJobs(prev => prev.map(j => j.id === confirmModal.jobId ? { ...j, status: "CLOSED" } : j));
      toast.success("Job closed permanently");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setConfirmModal({ open: false, type: null, jobId: null }); }
  }

  function closeModal() {
    setModalOpen(false); setTitle(""); setDepartment(""); setLocation(""); setDescription(""); setFormError("");
  }

  const STATUS_BADGE: Record<string, any> = {
    OPEN: { label: "Open", variant: "success" },
    PUBLISHED: { label: "Open", variant: "success" },
    DRAFT: { label: "Draft", variant: "neutral" },
    CLOSED: { label: "Closed", variant: "neutral" },
  };

  /* â€”â€”â€” Jobs Table â€”â€”â€” */
  const content = (
    <div className="rounded-[var(--radius-default)] border border-[var(--border-default)] overflow-hidden bg-[var(--bg-surface)]">
      {/* Table header */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
        <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Job Title</span>
        <span className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</span>
        <span className="hidden md:block w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Candidates</span>
        <span className="hidden md:block w-32 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Created</span>
        <span className="w-48 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Actions</span>
      </div>

      {/* Rows */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-divider)]">
            <div className="flex-1 flex flex-col gap-1.5"><Skeleton width="40%" height={13} /><Skeleton width="55%" height={11} /></div>
            <Skeleton width={60} height={20} rounded="full" />
          </div>
        ))
      ) : jobs.length === 0 ? (
        <EmptyState
          compact
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>}
          title="No jobs created"
          description="Create your first job to start tracking candidates."
          action={<Button size="sm" onClick={() => setModalOpen(true)}>Create Job</Button>}
        />
      ) : (
        jobs.map(job => {
          const statusCfg = STATUS_BADGE[job.status] ?? STATUS_BADGE.DRAFT;
          return (
            <div key={job.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border-divider)] hover:bg-[var(--bg-elevated)] transition-colors last:border-b-0">
              {/* Job */}
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {job.title}
                </span>
                <span className="text-xs text-[var(--text-muted)] truncate">
                  {job.department || "No department"} {job.location ? `• ${job.location}` : ""}
                </span>
              </div>

              {/* Status */}
              <div className="w-28 shrink-0">
                <Badge variant={statusCfg.variant} size="sm">{statusCfg.label}</Badge>
              </div>

              {/* Candidates Count */}
              <div className="hidden md:block w-28 shrink-0">
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  {job._count.candidates}
                </span>
              </div>

              {/* Created */}
              <div className="hidden md:block w-32 shrink-0">
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(job.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Actions */}
              <div className="w-48 shrink-0 flex items-center justify-end gap-2">
                {job.status === "DRAFT" && (
                  <button
                    onClick={() => handlePublishJob(job.id)}
                    className="h-7 px-2.5 flex items-center gap-1 rounded-[var(--radius-default)] text-xs font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity shadow-sm"
                    title="Publish job (Draft → Open)"
                    aria-label={`Publish ${job.title}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Publish
                  </button>
                )}
                {job.status === "OPEN" && (
                  <button
                    onClick={() => handleCopyLink(job.id)}
                    className="h-7 px-2 flex items-center gap-1 rounded-[var(--radius-default)] text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-muted)] border border-[var(--accent-muted)] transition-colors"
                    title="Copy public application link"
                    aria-label={`Copy link for ${job.title}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Copy Link
                  </button>
                )}
                {job.status !== "CLOSED" && (
                  <button
                    onClick={() => handleCloseJob(job.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-[var(--radius-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors"
                    title="Close job permanently"
                    aria-label={`Close ${job.title}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </button>
                )}
                <button
                  onClick={() => handleDeleteJob(job.id, job._count.candidates)}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-[var(--radius-default)] transition-colors",
                    job._count.candidates > 0
                      ? "text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                      : "text-[var(--text-muted)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                  )}
                  title={job._count.candidates > 0 ? "Cannot delete job with candidates" : "Delete job"}
                  aria-label={`Delete ${job.title}`}
                  disabled={job._count.candidates > 0}
                >
                  {Icons.trash}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <WorkspaceTemplate
        header={
          <PageHeader
            title="Jobs"
            description="Manage job postings and role definitions."
            backHref="/dashboard"
            backLabel="Back to Dashboard"
            actions={
              <div className="flex items-center gap-2">
                {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
                <Button size="sm" onClick={() => setModalOpen(true)}>Create Job</Button>
              </div>
            }
          />
        }
        content={content}
      />

      <Modal
        open={modalOpen} onClose={closeModal}
        title="Create Job"
        description="Add a new job in Draft state. You can publish it when ready to accept applications."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
            <Button size="md" onClick={handleCreateJob} loading={creating}>Create Job</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input autoFocus label="Job Title *" value={title} onChange={e => { setTitle(e.target.value); setFormError(""); }} placeholder="e.g. Senior Frontend Engineer" error={formError.includes("title") ? formError : ""} />
          <div className="flex gap-4">
            <Input label="Department (Optional)" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
            <Input label="Location (Optional)" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Remote, NY" />
          </div>
          <Textarea label="Job Description *" value={description} onChange={e => { setDescription(e.target.value); setFormError(""); }} placeholder="Paste the full job description here..." className="min-h-[200px]" />
          {formError && !formError.includes("title") && <p className="text-xs text-[var(--danger-text)]">{formError}</p>}
        </div>
      </Modal>

      <Modal open={confirmModal.open} onClose={() => setConfirmModal({ open: false, type: null, jobId: null })} title={confirmModal.type === "DELETE" ? "Delete Job" : "Close Job"}>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          {confirmModal.type === "DELETE" 
            ? "Delete this job? This cannot be undone."
            : "Close this job? Candidates will no longer be able to apply."}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmModal({ open: false, type: null, jobId: null })}>Cancel</Button>
          <Button onClick={confirmModal.type === "DELETE" ? confirmDeleteJob : confirmCloseJob} className={confirmModal.type === "DELETE" ? "bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white" : ""}>
            {confirmModal.type === "DELETE" ? "Yes, delete" : "Yes, close job"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
