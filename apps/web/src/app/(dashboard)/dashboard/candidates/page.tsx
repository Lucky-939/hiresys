"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { getErrorMessage } from "@/lib/error";
import { toast } from "sonner";

const STAGE_MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline" }> = {
  APPLIED: { label: "Applied", variant: "outline" },
  SCREENING: { label: "Screening", variant: "warning" },
  INTERVIEWING: { label: "Interview", variant: "default" },
  OFFER: { label: "Offer", variant: "success" },
  HIRED: { label: "Hired", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-red-600", "bg-orange-600", "bg-indigo-600"
];

function Avatar({ name, size = 36, seed = 0 }: { name: string; size?: number; seed?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const bgColor = AVATAR_COLORS[seed % AVATAR_COLORS.length];
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className={cn("rounded-full text-white flex items-center justify-center font-semibold shrink-0 shadow-sm", bgColor)}
    >
      {initials}
    </div>
  );
}

export default function CandidatesPage() {
  const router = useRouter();
  const { orgs, selectedOrgId, isReady } = useOrganizations();

  // We use mock data here to showcase the UI requirements if API returns empty
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "grid">("table");
  
  // Add Candidate State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleAddCandidate() {
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    if (!selectedOrgId) { setError("No organization selected."); return; }
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/candidates", {
        organizationId: selectedOrgId,
        name: name.trim(),
        email: email.trim(),
        role: role.trim() || undefined
      });
      setCandidates(prev => [res.data.data, ...prev]);
      setModalOpen(false);
      setName(""); setEmail(""); setRole("");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }
  
  useEffect(() => {
    if (!isReady) return;
    if (!selectedOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/candidates/org/${selectedOrgId}`)
      .then((res) => {
        const data = res.data.data;
        if (data.length > 0) {
          setCandidates(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } else {
          setCandidates([]);
        }
      })
      .catch((e) => {
        console.error(e);
        setCandidates([]);
      })
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  function getScoreColor(score: number | null) {
    if (!score) return "text-[var(--text-muted)]";
    if (score >= 80) return "text-[var(--success-text)] font-semibold";
    if (score >= 60) return "text-[var(--warning-text)] font-semibold";
    return "text-[var(--danger-text)] font-semibold";
  }

  function getTimeAgo(dateString: string) {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Candidates</h2>
          <Badge variant="outline" className="px-2.5 py-0.5 rounded-full font-mono text-xs shadow-sm bg-[var(--bg-surface)]">
            {loading ? "..." : candidates.length}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
          
          <div className="flex items-center rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-0.5 shadow-sm">
            <button 
              onClick={() => setView("table")} 
              className={cn("p-1.5 rounded-sm transition-colors", view === "table" ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
            >
              {Icons.list}
            </button>
            <button 
              onClick={() => setView("grid")} 
              className={cn("p-1.5 rounded-sm transition-colors", view === "grid" ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
            >
              {Icons.grid}
            </button>
          </div>

          <Button variant="outline" className="h-9 gap-2 shadow-sm bg-[var(--bg-surface)]" onClick={() => toast("Filtering candidates...")}>
            {Icons.filter} Filter
          </Button>
          <Button variant="outline" className="h-9 gap-2 shadow-sm bg-[var(--bg-surface)]" onClick={() => toast("Sorting candidates...")}>
            {Icons.sort} Sort
          </Button>
          <Button variant="outline" className="h-9 gap-2 shadow-sm bg-[var(--bg-surface)]" onClick={async () => {
            if (!selectedOrgId) return;
            try {
              const res = await api.get(`/candidates/org/${selectedOrgId}/export`, { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `candidates-${selectedOrgId}.csv`);
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
            } catch(e) {
              console.error("Failed to export", e);
            }
          }}>
            Export CSV
          </Button>
          <Button variant="default" className="h-9 gap-2" onClick={() => setModalOpen(true)}>
            {Icons.plus} Add Candidate
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-12 w-full skeleton" />
            <div className="h-12 w-full skeleton" />
            <div className="h-12 w-full skeleton" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center px-6">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] mb-4">
              {Icons.candidates}
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Candidates</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-6">
              Create your first candidate profile to begin managing hiring workflows.
            </p>
            <Button variant="default" onClick={() => setModalOpen(true)}>
              {Icons.plus} Create Candidate
            </Button>
          </div>
        ) : view === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[var(--bg-base)] border-b border-[var(--border-default)]">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] tracking-wider uppercase text-xs">Candidate</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] tracking-wider uppercase text-xs">Role Applied</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] tracking-wider uppercase text-xs">Stage</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] tracking-wider uppercase text-xs">Score</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] tracking-wider uppercase text-xs text-center">AI</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] tracking-wider uppercase text-xs">Last Updated</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] tracking-wider uppercase text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {candidates.map((c) => {
                  const stage = STAGE_MAP[c.stage] ?? STAGE_MAP.APPLIED;
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => router.push(`/dashboard/candidates/${c.id}`)}
                      className="group hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} seed={c.name.length} />
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{c.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">
                        {c.role || "General"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={stage.variant} dot>
                          {stage.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getScoreColor(c.latestScore)}>
                          {c.latestScore ? `${c.latestScore}%` : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("text-xs font-bold", c.hasAI || c.latestScore ? "text-[var(--accent)]" : "text-[var(--border-strong)]")}>
                          AI
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-subtle)] font-mono text-xs">
                        {getTimeAgo(c.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                          {Icons.moreVertical}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 bg-[var(--bg-base)]">
            {candidates.map((c) => {
              const stage = STAGE_MAP[c.stage] ?? STAGE_MAP.APPLIED;
              return (
                <div 
                  key={c.id} 
                  onClick={() => router.push(`/dashboard/candidates/${c.id}`)}
                  className="flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[var(--accent)] group relative"
                >
                  <div className="absolute top-4 right-4 text-[12px] font-bold">
                     <span className={cn(c.hasAI || c.latestScore ? "text-[var(--accent)]" : "text-[var(--border-strong)]")}>
                        AI
                      </span>
                  </div>
                  <Avatar name={c.name} seed={c.name.length} size={48} />
                  <div className="mt-4 mb-2">
                    <h3 className="font-semibold text-[var(--text-primary)] text-lg leading-tight">{c.name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{c.role || "General Application"}</p>
                  </div>
                  <Badge variant={stage.variant} dot className="w-fit mb-4">{stage.label}</Badge>
                  <div className="mt-auto pt-4 border-t border-[var(--border-default)] flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-[var(--text-subtle)] font-semibold tracking-wider">Score</span>
                      <span className={cn("text-sm", getScoreColor(c.latestScore))}>{c.latestScore ? `${c.latestScore}%` : "—"}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] uppercase text-[var(--text-subtle)] font-semibold tracking-wider">Updated</span>
                      <span className="text-sm text-[var(--text-muted)]">{getTimeAgo(c.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Add Candidate Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setError(""); }}
        title="Add Candidate"
        description="Manually add a new candidate to your pipeline."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="md" onClick={handleAddCandidate} loading={creating}>Add Candidate</Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input label="Full Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Doe" autoFocus />
          <Input label="Email Address *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
          <Input label="Role Applied (Optional)" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
          {error && <p className="text-sm text-[var(--danger-text)] m-0">{error}</p>}
        </div>
      </Modal>

    </div>
  );
}
