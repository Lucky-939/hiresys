"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { api } from "@/lib/api";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

const STAGES = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "HIRED", "REJECTED"];
const STAGE_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEWING: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected"
};

const STAGE_COLORS: Record<string, string> = {
  APPLIED: "border-t-[var(--border-strong)]",
  SCREENING: "border-t-[var(--warning)]",
  INTERVIEWING: "border-t-[var(--accent)]",
  OFFER: "border-t-[var(--info)]",
  HIRED: "border-t-[var(--success)]",
  REJECTED: "border-t-[var(--danger)]"
};

type Candidate = {
  id: string;
  name: string;
  email: string;
  stage: string;
  role?: string;
  latestScore: number | null;
  hasAI: boolean;
  createdAt: string;
};

export default function PipelinePage() {
  const router = useRouter();
  const { orgs, selectedOrgId, isReady } = useOrganizations();

  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !selectedOrgId) {
      if (isReady && !selectedOrgId) setLoading(false);
      return;
    }
    setLoading(true);

    api.get(`/candidates/org/${selectedOrgId}`)
      .then((res) => {
        const raw = res.data.data;
        const mapped: Record<string, Candidate[]> = {};
        STAGES.forEach(s => mapped[s] = []);
        raw.forEach((c: any) => {
          if (mapped[c.stage]) {
            mapped[c.stage].push({
              ...c,
              role: c.role || "General",
              hasAI: c.resumeScore !== null || c.atsScore !== null || c.latestScore !== null
            });
          }
        });
        setCandidates(mapped);
      })
      .catch((err: unknown) => {
        toast.error(getErrorMessage(err));
        const empty: Record<string, Candidate[]> = {};
        STAGES.forEach(s => empty[s] = []);
        setCandidates(empty);
      })
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = [...candidates[source.droppableId]];
    const destCol = source.droppableId === destination.droppableId ? sourceCol : [...candidates[destination.droppableId]];
    
    const [moved] = sourceCol.splice(source.index, 1);
    moved.stage = destination.droppableId;
    destCol.splice(destination.index, 0, moved);

    setCandidates(prev => ({
      ...prev,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol
    }));

    if (source.droppableId !== destination.droppableId) {
      try {
        if (destination.droppableId === "HIRED" || destination.droppableId === "REJECTED") {
          await api.patch(`/candidates/${moved.id}/decision`, { decision: destination.droppableId, notes: "Moved via Pipeline board" });
        } else {
          await api.patch(`/candidates/${moved.id}/stage`, { stage: destination.droppableId });
        }
        toast.success(`Moved ${moved.name} to ${STAGE_LABELS[destination.droppableId]}`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full gap-6 p-6 overflow-hidden">
        {STAGES.map((s, i) => (
          <div key={i} className="min-w-[320px] h-[80vh] skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-end justify-between px-6 py-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Hiring Pipeline</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Drag and drop candidates to update their stage.</p>
        </div>
        <div className="flex items-center gap-4">
          {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6 scrollbar-hide cursor-grab active:cursor-grabbing">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full gap-6 items-start">
            {STAGES.map((stage) => {
              const columnCandidates = candidates[stage] || [];
              
              return (
                <div key={stage} className={cn("flex flex-col shrink-0 w-[340px] max-h-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-sm overflow-hidden", STAGE_COLORS[stage])}>
                  
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      {STAGE_LABELS[stage]}
                    </h3>
                    <Badge variant="neutral" className="bg-[var(--bg-base)] border-[var(--border-default)]">{columnCandidates.length}</Badge>
                  </div>

                  {/* Drop Zone */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn("flex-1 overflow-y-auto p-4 space-y-4 min-h-[150px] transition-colors", snapshot.isDraggingOver ? "bg-[var(--accent)]/5" : "")}
                      >
                        {columnCandidates.map((candidate, index) => (
                          <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                }}
                                onClick={() => router.push(`/dashboard/candidates/${candidate.id}`)}
                                className={cn(
                                  "flex flex-col bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)] shadow-sm cursor-pointer select-none transition-all",
                                  snapshot.isDragging ? "shadow-xl rotate-2 ring-2 ring-[var(--accent)] ring-offset-1 border-transparent z-50" : "hover:border-[var(--accent-muted)] hover:shadow-md"
                                )}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-semibold text-[var(--text-primary)] leading-tight">{candidate.name}</h4>
                                  {candidate.hasAI && (
                                    <span className="text-[var(--accent)] ml-2 text-xs">AI</span>
                                  )}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mb-4">{candidate.role}</p>
                                
                                <div className="flex items-center justify-between mt-auto">
                                  {candidate.latestScore !== null ? (
                                    <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-sm", candidate.latestScore >= 80 ? "bg-[var(--success-bg)] text-[var(--success-text)]" : candidate.latestScore >= 60 ? "bg-[var(--warning-bg)] text-[var(--warning-text)]" : "bg-[var(--danger-bg)] text-[var(--danger-text)]")}>
                                      {candidate.latestScore}%
                                    </span>
                                  ) : (
                                    <span className="text-xs text-[var(--text-disabled)]">—</span>
                                  )}
                                  <span className="text-[10px] text-[var(--text-subtle)] font-mono uppercase tracking-widest">
                                    {Math.floor((Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 3600 * 24))}d in stage
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

    </div>
  );
}
