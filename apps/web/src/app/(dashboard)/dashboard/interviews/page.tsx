"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { Icons } from "@/components/ui/Icons";
import { getErrorMessage } from "@/lib/error";

const STATUS_MAP: Record<
  string,
  { label: string; variant: "info" | "success" | "neutral" | "error" | "live" }
> = {
  SCHEDULED: { label: "Scheduled", variant: "info" },
  ACTIVE: { label: "Live", variant: "live" },
  COMPLETED: { label: "Completed", variant: "neutral" },
  CANCELLED: { label: "Cancelled", variant: "error" },
};

type Interview = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  createdBy: { name: string };
  candidate?: { name: string } | null;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
};

export default function InterviewsPage() {
  const router = useRouter();
  const { orgs, selectedOrgId, isReady } = useOrganizations();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningInterview, setAssigningInterview] = useState<Interview | null>(null);
  const [assignCandidateId, setAssignCandidateId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!isReady) return;
    if (!selectedOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      api.get(`/interviews/org/${selectedOrgId}`),
      api.get(`/candidates/org/${selectedOrgId}`)
    ])
      .then(([ivRes, candRes]) => {
        setInterviews(ivRes.data.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setCandidates(candRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  const filtered = useMemo(() => {
    return interviews.filter((iv) => {
      const matchesSearch = iv.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || iv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [interviews, search, statusFilter]);

  async function createInterview() {
    if (!interviewTitle.trim()) { setCreateError("Interview title is required."); return; }
    setCreating(true);
    setCreateError("");
    try {
      if (!selectedOrgId) throw new Error("No organization selected");
      
      const { data } = await api.post("/interviews", {
        title: interviewTitle.trim(),
        organizationId: selectedOrgId,
        candidateId: selectedCandidate || undefined
      });
      setInterviews((prev) => [data.data, ...prev]);
      setModalOpen(false);
      setInterviewTitle("");
      setSelectedCandidate("");
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function closeModal() { setModalOpen(false); setInterviewTitle(""); setSelectedCandidate(""); setCreateError(""); }

  async function assignCandidate() {
    if (!assigningInterview) return;
    setAssigning(true);
    setAssignError("");
    try {
      await api.patch(`/interviews/${assigningInterview.id}/candidate`, { candidateId: assignCandidateId || null });
      setInterviews((prev) => prev.map((iv) => iv.id === assigningInterview.id ? { ...iv, candidate: assignCandidateId ? candidates.find(c => c.id === assignCandidateId) : null } : iv));
      closeAssignModal();
    } catch (err: unknown) {
      setAssignError(getErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  }

  function closeAssignModal() { setAssignModalOpen(false); setAssigningInterview(null); setAssignCandidateId(""); setAssignError(""); }

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
            Interviews
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-tertiary)", margin: 0 }}>
            All interview sessions across your organization.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {orgs.length > 1 && (
            <OrganizationSelector orgs={orgs} />
          )}

          <Button size="md" onClick={() => setModalOpen(true)} icon={Icons.plus}>
            New Interview
          </Button>
        </div>
      </div>

      {/* ——— Filters ——— */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", maxWidth: "400px", minWidth: "240px" }}>
          <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-disabled)", display: "flex", pointerEvents: "none" }}>
            {Icons.search}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search interviews..."
            className="search-input"
          />
        </div>

        <div style={{ position: "relative" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ACTIVE">Live</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid var(--border-subtle)", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 150px", padding: "16px 24px", background: "#FAFAFA", borderBottom: "1px solid var(--border-subtle)" }}>
          {["Title", "Candidate", "Status", "Date", ""].map((h, idx) => (
            <span key={idx} style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: idx === 4 ? "right" : "left" }}>
              {h}
            </span>
          ))}
        </div>

        {/* ——— Interview List ——— */}
        {loading ? (
          <div style={{ padding: "16px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 150px", padding: "16px 8px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Skeleton width="32px" height="32px" borderRadius="8px" />
                  <Skeleton height="14px" width="160px" />
                </div>
                <Skeleton height="14px" width="120px" />
                <Skeleton height="24px" width="80px" borderRadius="12px" />
                <Skeleton height="14px" width="100px" />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Skeleton height="32px" width="80px" borderRadius="8px" />
                </div>
              </div>
            ))}
          </div>
        ) : !selectedOrgId && isReady ? (
          <EmptyState
            icon={Icons.fileText}
            title="No organizations"
            description="You need to create or join an organization first."
          />
        ) : interviews.length === 0 ? (
          <EmptyState
            icon={Icons.fileText}
            title="No Interviews"
            description="Create an interview to start evaluating candidates."
            action={
              <Button size="md" onClick={() => setModalOpen(true)}>
                Create interview
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching interviews"
            description="Try adjusting your search or filter."
          />
        ) : (
          <div className="animate-stagger">
            {filtered.map((iv, idx) => {
              const status = STATUS_MAP[iv.status] ?? STATUS_MAP.SCHEDULED;
              const isLive = iv.status === "ACTIVE";
              return (
                <div
                  key={iv.id}
                  className="table-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.5fr 1fr 1fr 150px",
                    alignItems: "center",
                    padding: "16px 24px",
                    borderBottom: idx < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                  onClick={() => router.push(`/room/${iv.id}`)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#F3F4F6", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {Icons.code}
                    </div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                        {iv.title}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: 0 }}>
                        by {iv.createdBy.name}
                      </p>
                    </div>
                  </div>

                  <div>
                    {iv.candidate ? (
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-secondary)" }}>{iv.candidate.name}</span>
                    ) : (
                      <button
                        className="assign-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssigningInterview(iv);
                          setAssignCandidateId("");
                          setAssignModalOpen(true);
                        }}
                      >
                        Assign Candidate
                      </button>
                    )}
                  </div>

                  <div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <div>
                    <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                      {new Date(iv.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    {iv.status === "COMPLETED" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/interviews/${iv.id}/report`);
                        }}
                      >
                        Report
                      </Button>
                    ) : isLive ? (
                      <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/room/${iv.id}`); }}>Join</Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/room/${iv.id}`); }}>Open</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ——— Create modal ——— */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="New interview"
        description="Schedule a coding interview session."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeModal}>
              Cancel
            </Button>
            <Button size="md" onClick={createInterview} loading={creating}>
              Create interview
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Input
            autoFocus
            label="Interview title *"
            value={interviewTitle}
            onChange={(e) => { setInterviewTitle(e.target.value); setCreateError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") createInterview(); }}
            placeholder="e.g. Frontend Engineer — Round 1"
            error={createError}
          />

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "8px" }}>Link Candidate (Optional)</label>
            <select
              value={selectedCandidate}
              onChange={(e) => setSelectedCandidate(e.target.value)}
              className="filter-select"
              style={{ width: "100%", paddingLeft: "12px", height: "40px" }}
            >
              <option value="">-- No Candidate --</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ——— Assign Candidate Modal ——— */}
      <Modal
        open={assignModalOpen}
        onClose={closeAssignModal}
        title="Assign Candidate"
        description={`Link a candidate to "${assigningInterview?.title}".`}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeAssignModal}>
              Cancel
            </Button>
            <Button size="md" onClick={assignCandidate} loading={assigning}>
              Save
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "8px" }}>Select Candidate</label>
            <select
              value={assignCandidateId}
              onChange={(e) => setAssignCandidateId(e.target.value)}
              className="filter-select"
              style={{ width: "100%", paddingLeft: "12px", height: "40px" }}
            >
              <option value="">-- No Candidate --</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
          {assignError && <p style={{ fontSize: "13px", color: "var(--error-text)", margin: 0 }}>{assignError}</p>}
        </div>
      </Modal>

      <style>{`
        .table-row:hover {
          background: #F9FAFB;
        }
        .assign-link {
          background: transparent;
          border: none;
          color: var(--accent);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
        }
        .assign-link:hover {
          text-decoration: underline;
        }
        .search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          font-size: 14px;
          color: var(--text-primary);
          background: #FFFFFF;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
          height: 40px;
        }
        .search-input::placeholder {
          color: var(--text-disabled);
        }
        .search-input:focus {
          border-color: var(--border-strong);
          box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.05);
        }
        .filter-select {
          padding: 8px 32px 8px 12px;
          font-size: 14px;
          color: var(--text-primary);
          background: #FFFFFF;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          height: 40px;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%236C757D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          transition: all 0.2s ease;
        }
        .filter-select:focus {
          border-color: var(--border-strong);
          box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.05);
        }
      `}</style>
    </>
  );
}
