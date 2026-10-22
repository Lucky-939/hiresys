"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { api } from "@/lib/api";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icons } from "@/components/ui/Icons";
import { cn, hasCompletedInterview } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";

type Candidate = {
  id: string;
  name: string;
  email: string;
  stageId: string;
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
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    moved: any;
    destination: string;
    sourceId: string;
    sourceIndex: number;
    destIndex: number;
  }>({ open: false, moved: null, destination: "", sourceId: "", sourceIndex: 0, destIndex: 0 });

  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Ref for horizontal scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Custom auto-scroll for drag & drop
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let animFrameId: number | null = null;
    let isDragging = false;

    const EDGE_SIZE = 80;
    const MAX_SPEED = 18;
    const MIN_SPEED = 3;

    const scroll = (pointerX: number) => {
      if (!isDragging) return;
      const rect = container.getBoundingClientRect();
      const distFromLeft = pointerX - rect.left;
      const distFromRight = rect.right - pointerX;

      let delta = 0;
      if (distFromLeft < EDGE_SIZE) {
        const ratio = 1 - distFromLeft / EDGE_SIZE;
        delta = -(MIN_SPEED + (MAX_SPEED - MIN_SPEED) * ratio);
      } else if (distFromRight < EDGE_SIZE) {
        const ratio = 1 - distFromRight / EDGE_SIZE;
        delta = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * ratio;
      }

      if (delta !== 0) {
        container.scrollLeft += delta;
      }

      animFrameId = requestAnimationFrame(() => {
        scroll(lastPointerX.current);
      });
    };

    const lastPointerX = { current: 0 };

    const onPointerMove = (e: PointerEvent) => {
      lastPointerX.current = e.clientX;
    };

    const onDragStart = () => {
      isDragging = true;
      animFrameId = requestAnimationFrame(() => scroll(lastPointerX.current));
    };

    const onDragEnd = () => {
      isDragging = false;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    container.addEventListener("dragStartSentinel" as any, onDragStart);
    container.addEventListener("dragEndSentinel" as any, onDragEnd);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("dragStartSentinel" as any, onDragStart);
      container.removeEventListener("dragEndSentinel" as any, onDragEnd);
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    };
  }, []);

  const loadPipelineData = async () => {
    if (!selectedOrgId) return;
    try {
      const [candRes, jobsRes, stagesRes] = await Promise.all([
        api.get(`/candidates/org/${selectedOrgId}`),
        api.get(`/jobs/org/${selectedOrgId}`),
        api.get(`/organizations/${selectedOrgId}/stages`)
      ]);
      setAllCandidates(candRes.data.data || []);
      setJobs(jobsRes.data.data || []);
      setStages(stagesRes.data.data || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setAllCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady || !selectedOrgId) {
      if (isReady && !selectedOrgId) setLoading(false);
      return;
    }
    setLoading(true);
    loadPipelineData();
  }, [selectedOrgId, isReady]);

  // Filter candidates and map to stages
  useEffect(() => {
    const mapped: Record<string, Candidate[]> = {};
    stages.forEach(s => mapped[s.id] = []);
    
    allCandidates.forEach((c: any) => {
      if (selectedJobId !== "ALL" && c.jobId !== selectedJobId) return;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = c.name?.toLowerCase().includes(query);
        const emailMatch = c.email?.toLowerCase().includes(query);
        const roleMatch = (c.job?.title || "General Application").toLowerCase().includes(query);
        if (!nameMatch && !emailMatch && !roleMatch) return;
      }

      const item: Candidate = {
        ...c,
        role: c.job?.title || "General Application",
        hasAI: c.resumeScore !== null || c.atsScore !== null || c.latestScore !== null
      };

      if (mapped[c.stageId]) {
        mapped[c.stageId].push(item);
      } else {
        const firstStage = stages[0];
        if (firstStage) {
          if (!mapped[firstStage.id]) mapped[firstStage.id] = [];
          mapped[firstStage.id].push(item);
        }
      }
    });

    setCandidates(mapped);
  }, [allCandidates, selectedJobId, searchQuery, stages]);

  const onDragStart = async () => {
    scrollContainerRef.current?.dispatchEvent(new Event("dragStartSentinel"));
  };

  const onDragEnd = async (result: DropResult) => {
    scrollContainerRef.current?.dispatchEvent(new Event("dragEndSentinel"));

    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const movedCandidate = candidates[source.droppableId][source.index];
    const destinationStage = stages.find(s => s.id === destination.droppableId);

    if (destinationStage && (destinationStage.type === "POSITIVE_TERMINAL" || destinationStage.type === "NEGATIVE_TERMINAL") && !hasCompletedInterview(movedCandidate)) {
      setConfirmModal({
        open: true,
        moved: movedCandidate,
        destination: destination.droppableId,
        sourceId: source.droppableId,
        sourceIndex: source.index,
        destIndex: destination.index
      });
      return;
    }

    executeDragUpdate(source.droppableId, destination.droppableId, source.index, destination.index, movedCandidate);
  };

  const executeDragUpdate = async (sourceId: string, destId: string, sourceIdx: number, destIdx: number, moved: any) => {
    setCandidates(prev => {
      const sourceCol = [...(prev[sourceId] || [])];
      const destCol = sourceId === destId ? sourceCol : [...(prev[destId] || [])];
      
      const [m] = sourceCol.splice(sourceIdx, 1);
      if (m) {
        m.stageId = destId;
        destCol.splice(destIdx, 0, m);
      }

      return {
        ...prev,
        [sourceId]: sourceCol,
        [destId]: destCol
      };
    });

    if (sourceId !== destId) {
      try {
        const destinationStage = stages.find(s => s.id === destId);
        await api.patch(`/candidates/${moved.id}/stage`, { stage: destId, stageId: destId });
        toast.success(`Moved ${moved.name} to ${destinationStage?.name}`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
        loadPipelineData();
      }
    }
  };

  const confirmDrag = () => {
    setConfirmModal(prev => ({ ...prev, open: false }));
    const { sourceId, destination, sourceIndex, destIndex, moved } = confirmModal;
    executeDragUpdate(sourceId, destination, sourceIndex, destIndex, moved);
  };

  // --- 1-Click Fast Actions (No Dragging Needed) ---

  // Move candidate to any target stage directly
  const handleMoveCandidate = async (candidateId: string, targetStageId: string) => {
    const cand = allCandidates.find(c => c.id === candidateId);
    if (!cand) return;
    const targetStage = stages.find(s => s.id === targetStageId);

    if (targetStage && (targetStage.type === "POSITIVE_TERMINAL" || targetStage.type === "NEGATIVE_TERMINAL") && !hasCompletedInterview(cand)) {
      setConfirmModal({
        open: true,
        moved: cand,
        destination: targetStageId,
        sourceId: cand.stageId,
        sourceIndex: 0,
        destIndex: 0
      });
      return;
    }

    try {
      await api.patch(`/candidates/${candidateId}/stage`, { stage: targetStageId, stageId: targetStageId });
      toast.success(`Moved ${cand.name} to ${targetStage?.name || "stage"}`);
      // Update candidate in local state
      setAllCandidates(prev => prev.map(item => item.id === candidateId ? { ...item, stageId: targetStageId } : item));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  // 1-Click Advance to Next Stage
  const handleAdvanceCandidate = async (candidate: Candidate, currentStageId: string) => {
    const currentIndex = stages.findIndex(s => s.id === currentStageId);
    if (currentIndex < 0 || currentIndex >= stages.length - 1) {
      toast.info(`${candidate.name} is already at the final stage.`);
      return;
    }
    const nextStage = stages[currentIndex + 1];
    await handleMoveCandidate(candidate.id, nextStage.id);
  };

  // 1-Click Quick Reject
  const handleRejectCandidate = async (candidate: Candidate) => {
    const rejectStage = stages.find(s => s.type === "NEGATIVE_TERMINAL" || s.name.toLowerCase().includes("reject"));
    if (!rejectStage) {
      toast.error("No rejection stage defined in this pipeline.");
      return;
    }
    await handleMoveCandidate(candidate.id, rejectStage.id);
  };

  // Selection toggle
  const toggleSelectCandidate = (candidateId: string) => {
    setSelectedCandidateIds(prev => 
      prev.includes(candidateId) ? prev.filter(id => id !== candidateId) : [...prev, candidateId]
    );
  };

  // Select all in a column
  const toggleSelectColumn = (stageId: string) => {
    const columnCandidates = candidates[stageId] || [];
    const columnIds = columnCandidates.map(c => c.id);
    const allSelected = columnIds.every(id => selectedCandidateIds.includes(id));

    if (allSelected) {
      setSelectedCandidateIds(prev => prev.filter(id => !columnIds.includes(id)));
    } else {
      setSelectedCandidateIds(prev => Array.from(new Set([...prev, ...columnIds])));
    }
  };

  // Bulk Advance All Selected
  const handleBulkAdvance = async () => {
    if (selectedCandidateIds.length === 0) return;
    setIsBulkOperating(true);
    const toastId = toast.loading(`Advancing ${selectedCandidateIds.length} candidate(s)...`);

    try {
      let count = 0;
      for (const id of selectedCandidateIds) {
        const cand = allCandidates.find(c => c.id === id);
        if (!cand) continue;
        const currentIdx = stages.findIndex(s => s.id === cand.stageId);
        if (currentIdx >= 0 && currentIdx < stages.length - 1) {
          const nextStage = stages[currentIdx + 1];
          await api.patch(`/candidates/${id}/stage`, { stage: nextStage.id, stageId: nextStage.id });
          count++;
        }
      }
      toast.success(`Successfully advanced ${count} candidate(s)!`, { id: toastId });
      setSelectedCandidateIds([]);
      await loadPipelineData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { id: toastId });
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Bulk Move to Specific Stage
  const handleBulkMove = async (targetStageId: string) => {
    if (selectedCandidateIds.length === 0) return;
    const targetStage = stages.find(s => s.id === targetStageId);
    setIsBulkOperating(true);
    const toastId = toast.loading(`Moving ${selectedCandidateIds.length} candidate(s) to ${targetStage?.name}...`);

    try {
      for (const id of selectedCandidateIds) {
        await api.patch(`/candidates/${id}/stage`, { stage: targetStageId, stageId: targetStageId });
      }
      toast.success(`Moved ${selectedCandidateIds.length} candidate(s) to ${targetStage?.name}`, { id: toastId });
      setSelectedCandidateIds([]);
      await loadPipelineData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { id: toastId });
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Bulk Reject Selected
  const handleBulkReject = async () => {
    const rejectStage = stages.find(s => s.type === "NEGATIVE_TERMINAL" || s.name.toLowerCase().includes("reject"));
    if (!rejectStage) {
      toast.error("No rejection stage configured.");
      return;
    }
    await handleBulkMove(rejectStage.id);
  };

  const totalCandidates = Object.values(candidates).flat().length;

  if (loading) {
    return (
      <div className="flex h-full w-full gap-6 p-6 overflow-hidden">
        {[1,2,3,4,5].map((_, i) => (
          <div key={i} className="min-w-[320px] h-[80vh] skeleton rounded-[var(--radius-default)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 pt-5 pb-4 shrink-0 border-b border-[var(--border-default)] bg-[var(--bg-base)]">
        <div>
          <PageHeader
            title="Hiring Pipeline"
            description="Manage your recruitment funnel with 1-click stage advancement, bulk actions, or drag & drop."
            backHref="/dashboard"
            backLabel="Back to Dashboard"
          />
        </div>

        {/* Filter & Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {/* Quick Search input */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-48 pl-8 pr-3 text-xs rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <Select 
            value={selectedJobId} 
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-44 h-9 text-xs"
          >
            <option value="ALL">All Jobs</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </Select>

          {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="relative flex-1 overflow-hidden">
        {/* Left Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--bg-base)] to-transparent z-10 pointer-events-none" />
        
        {/* Right Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg-base)] to-transparent z-10 pointer-events-none" />
        
        {/* Scroll Area */}
        <div
          ref={scrollContainerRef}
          className="w-full h-full overflow-x-auto overflow-y-hidden px-6 pb-20 scrollbar-hide snap-x snap-mandatory"
        >
          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex h-full gap-5 items-start">
              {stages.map((stage, stageIdx) => {
                const columnCandidates = candidates[stage.id] || [];
                const nextStage = stageIdx < stages.length - 1 ? stages[stageIdx + 1] : null;
                const allColSelected = columnCandidates.length > 0 && columnCandidates.every(c => selectedCandidateIds.includes(c.id));

                return (
                  <div
                    key={stage.id}
                    className="flex flex-col shrink-0 w-[350px] max-h-full rounded-[var(--radius-default)] bg-[var(--bg-elevated)] border border-[var(--border-default)] overflow-hidden snap-start scroll-m-6 border-t-[3px] shadow-sm"
                    style={{ borderTopColor: stage.color }}
                  >
                    
                    {/* Column Header */}
                    <div className="flex items-center justify-between p-3.5 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
                      <div className="flex items-center gap-2 min-w-0">
                        {columnCandidates.length > 0 && (
                          <input
                            type="checkbox"
                            checked={allColSelected}
                            onChange={() => toggleSelectColumn(stage.id)}
                            title="Select all candidates in this stage"
                            className="h-3.5 w-3.5 rounded text-[var(--accent)] border-[var(--border-default)] cursor-pointer focus:ring-0"
                          />
                        )}
                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider truncate">
                          {stage.name}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="neutral" size="sm" className="font-mono">{columnCandidates.length}</Badge>
                      </div>
                    </div>
  
                    {/* Drop Zone */}
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "relative flex-1 min-h-[160px] transition-colors",
                            snapshot.isDraggingOver ? "bg-[var(--accent)]/5" : ""
                          )}
                        >
                          <div className="absolute inset-0 overflow-y-auto p-3 space-y-3">
                            {columnCandidates.map((candidate, index) => {
                              const isSelected = selectedCandidateIds.includes(candidate.id);

                              return (
                                <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={{ ...provided.draggableProps.style }}
                                      onClick={() => router.push(`/dashboard/candidates/${candidate.id}`)}
                                      className={cn(
                                        "group relative flex flex-col bg-[var(--bg-surface)] p-3 rounded-[var(--radius-default)] border transition-all cursor-pointer select-none",
                                        isSelected
                                          ? "border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[var(--accent)]/5"
                                          : "border-[var(--border-default)] hover:border-[var(--accent)]/70 hover:shadow-sm",
                                        snapshot.isDragging ? "rotate-1 ring-2 ring-[var(--accent)] border-transparent z-50 shadow-xl" : ""
                                      )}
                                    >
                                      {/* Top Row: Selection Checkbox & Info */}
                                      <div className="flex items-start gap-2.5 mb-2">
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelectCandidate(candidate.id);
                                          }}
                                          className="pt-0.5"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="h-3.5 w-3.5 rounded text-[var(--accent)] border-[var(--border-default)] cursor-pointer focus:ring-0"
                                          />
                                        </div>

                                        <Avatar name={candidate.name} size="sm" />

                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight group-hover:text-[var(--accent)] transition-colors">
                                            {candidate.name}
                                          </h4>
                                          <p className="text-[10px] text-[var(--text-muted)] truncate">{candidate.role}</p>
                                        </div>

                                        {candidate.hasAI && (
                                          <span className="text-[9px] font-bold text-[var(--accent)] bg-[var(--accent-muted)] px-1.5 py-0.5 rounded shrink-0">
                                            AI
                                          </span>
                                        )}
                                      </div>

                                      {/* Match Score */}
                                      {candidate.latestScore !== null && (
                                        <div className="flex items-center justify-between mb-2.5 px-0.5">
                                          <span className="text-[10px] text-[var(--text-muted)]">Match Score</span>
                                          <span className={cn(
                                            "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded",
                                            candidate.latestScore >= 80 ? "bg-[var(--accent)]/10 text-[var(--accent)]" :
                                            candidate.latestScore >= 60 ? "bg-[var(--accent)]/10 text-[var(--accent)]" :
                                            "bg-[var(--danger)]/10 text-[var(--danger)]"
                                          )}>
                                            {candidate.latestScore}%
                                          </span>
                                        </div>
                                      )}

                                      {/* Fast Recruiter Actions Strip (1-Click Pipeline Management) */}
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="pt-2 border-t border-[var(--border-default)]/60 flex items-center justify-between gap-1.5"
                                      >
                                        {/* 1-Click Advance Button */}
                                        {nextStage && stage.type !== "POSITIVE_TERMINAL" && stage.type !== "NEGATIVE_TERMINAL" ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAdvanceCandidate(candidate, stage.id);
                                            }}
                                            className="h-6 px-2 rounded bg-[var(--accent)] text-white text-[10px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-xs shrink-0"
                                            title={`Advance to ${nextStage.name}`}
                                          >
                                            <span>Advance</span>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                          </button>
                                        ) : (
                                          <div className="text-[10px] font-medium text-[var(--text-muted)] px-1">
                                            {stage.type === "POSITIVE_TERMINAL" ? "Hired" : stage.type === "NEGATIVE_TERMINAL" ? "Rejected" : "Final Stage"}
                                          </div>
                                        )}

                                        <div className="flex items-center gap-1">
                                          {/* Move to Stage dropdown */}
                                          <select
                                            value={stage.id}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              if (e.target.value !== stage.id) {
                                                handleMoveCandidate(candidate.id, e.target.value);
                                              }
                                            }}
                                            className="h-6 px-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] cursor-pointer focus:outline-none transition-colors max-w-[95px] truncate"
                                            title="Move directly to any stage"
                                          >
                                            <option value={stage.id} disabled>Move to...</option>
                                            {stages.map(s => (
                                              <option key={s.id} value={s.id} disabled={s.id === stage.id}>
                                                {s.name} {s.id === stage.id ? "(Current)" : ""}
                                              </option>
                                            ))}
                                          </select>

                                          {/* Quick Reject Button */}
                                          {stage.type !== "NEGATIVE_TERMINAL" && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRejectCandidate(candidate);
                                              }}
                                              className="h-6 w-6 rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/50 flex items-center justify-center transition-colors shrink-0"
                                              title="Quick Reject"
                                            >
                                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                          </div>

                          {provided.placeholder}
                          {columnCandidates.length === 0 && (
                            <div className="absolute inset-3 border-2 border-dashed border-[var(--border-default)]/60 rounded-lg flex flex-col items-center justify-center text-[var(--text-muted)] pointer-events-none opacity-60">
                              <span className="text-xs font-medium">
                                {totalCandidates === 0 ? "No candidates yet" : "No candidates in this stage"}
                              </span>
                            </div>
                          )}
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

      {/* Floating Recruiter Bulk Action Bar (When Candidates Selected) */}
      {selectedCandidateIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 ring-1 ring-[var(--accent)]/30">
          <div className="flex items-center gap-2 pr-3 border-r border-[var(--border-default)]">
            <span className="h-5 w-5 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center">
              {selectedCandidateIds.length}
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">Selected</span>
          </div>

          {/* Bulk Advance Button */}
          <Button
            size="sm"
            onClick={handleBulkAdvance}
            disabled={isBulkOperating}
            className="h-8 text-xs bg-[var(--accent)] text-white hover:brightness-110 flex items-center gap-1.5 shadow-sm"
          >
            <span>Advance All</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </Button>

          {/* Bulk Move To Stage */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">Move to:</span>
            <select
              disabled={isBulkOperating}
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkMove(e.target.value);
                  e.target.value = "";
                }
              }}
              className="h-8 px-2 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] cursor-pointer focus:outline-none"
            >
              <option value="">Choose Stage...</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Bulk Reject */}
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkReject}
            disabled={isBulkOperating}
            className="h-8 text-xs"
          >
            Reject Selected
          </Button>

          {/* Deselect */}
          <button
            onClick={() => setSelectedCandidateIds([])}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] pl-2 transition-colors underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Confirm Stage Change Modal */}
      <Modal open={confirmModal.open} onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))} title="Confirm Stage Change">
        <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
          This candidate hasn't completed an interview yet. Are you sure you want to move <strong className="text-[var(--text-primary)]">{confirmModal.moved?.name}</strong> to {stages.find(s => s.id === confirmModal.destination)?.name}?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}>Cancel</Button>
          <Button onClick={confirmDrag}>Yes, continue</Button>
        </div>
      </Modal>
    </div>
  );
}
