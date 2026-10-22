"use client";

import { BackLink } from "@/components/layout/templates";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useOrganizations } from "@/components/ui/OrganizationSelector";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Modal } from "@/components/ui/Modal";

type Stage = {
  id: string;
  name: string;
  color: string;
  type: string;
  order: number;
};

export default function PipelineStagesSettingsPage() {
  const { selectedOrgId, isReady } = useOrganizations();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isEditing, setIsEditing] = useState<Stage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<Stage | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [color, setColor] = useState("#000000");
  const [type, setType] = useState("STANDARD");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isReady || !selectedOrgId) return;
    fetchStages();
  }, [isReady, selectedOrgId]);

  const fetchStages = async () => {
    try {
      const res = await api.get(`/organizations/${selectedOrgId}/stages`);
      setStages(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update optimistic order
    const orderedItems = items.map((item, index) => ({ ...item, order: index }));
    setStages(orderedItems);

    try {
      await api.put(`/organizations/${selectedOrgId}/stages/orders`, {
        stageIds: orderedItems.map((s) => s.id),
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
      fetchStages(); // revert on fail
    }
  };

  const openCreate = () => {
    setName("");
    setColor("var(--accent)");
    setType("STANDARD");
    setIsCreating(true);
  };

  const openEdit = (stage: Stage) => {
    setName(stage.name);
    setColor(stage.color);
    setType(stage.type);
    setIsEditing(stage);
  };

  const saveStage = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/organizations/${selectedOrgId}/stages/${isEditing.id}`, { name, color, type });
        toast.success("Stage updated");
      } else {
        await api.post(`/organizations/${selectedOrgId}/stages`, { name, color, type });
        toast.success("Stage created");
      }
      setIsEditing(null);
      setIsCreating(false);
      fetchStages();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteStage = async () => {
    if (!isDeleting) return;
    setSaving(true);
    try {
      await api.delete(`/organizations/${selectedOrgId}/stages/${isDeleting.id}`);
      toast.success("Stage deleted");
      setIsDeleting(null);
      fetchStages();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="flex flex-col gap-5 max-w-[var(--settings-max-width)]">
      <div className="flex items-center gap-4 -mb-1">
        <BackLink href="/dashboard/pipeline" label="Back to Pipeline" />
      </div>
      <Card padding="default">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pipeline Stages</CardTitle>
            <p className="text-sm text-[var(--text-muted)] mt-1">Manage the stages in your hiring pipeline.</p>
          </div>
          <Button onClick={openCreate} size="sm">Add Stage</Button>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stages">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-2">
                  {stages.map((stage, index) => (
                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={provided.draggableProps.style as React.CSSProperties}
                          className="flex flex-row items-center justify-between p-3 border border-[var(--border-default)] rounded-[var(--radius-default)] bg-[var(--bg-elevated)]"
                        >
                          <div className="flex items-center gap-3">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] cursor-grab active:cursor-grabbing">
                              <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                              <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                            </svg>
                            <Badge variant="neutral" style={{ borderLeft: `3px solid ${stage.color}` }}>{stage.name}</Badge>
                            <span className="text-xs text-[var(--text-muted)] ml-2">{stage.type}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(stage)}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => setIsDeleting(stage)} className="text-[var(--danger-text)] hover:text-[var(--danger-text)]">Delete</Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Editor Modal */}
      <Modal
        open={!!isEditing || isCreating}
        onClose={() => { setIsEditing(null); setIsCreating(false); }}
        title={isEditing ? "Edit Stage" : "New Stage"}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Technical Interview" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Color (Hex or CSS Var)</label>
            <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#000000 or var(--accent)" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-9 px-3 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="STANDARD">Standard</option>
              <option value="POSITIVE_TERMINAL">Positive Terminal (e.g. Hired)</option>
              <option value="NEGATIVE_TERMINAL">Negative Terminal (e.g. Rejected)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setIsEditing(null); setIsCreating(false); }}>Cancel</Button>
            <Button onClick={saveStage} loading={saving}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        title="Delete Stage"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Are you sure you want to delete the stage <strong>{isDeleting?.name}</strong>? This action cannot be undone. You cannot delete a stage if there are candidates currently in it.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsDeleting(null)}>Cancel</Button>
            <Button onClick={deleteStage} loading={saving} variant="destructive">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
