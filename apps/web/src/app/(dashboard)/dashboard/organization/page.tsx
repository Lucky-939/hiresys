"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOrgStore } from "@/store/org.store";
import { Icons } from "@/components/ui/Icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Organization = {
  id: string;
  name: string;
  _count?: {
    interviews?: number;
    members?: number;
  };
};


export default function OrganizationPage() {
  const router = useRouter();
  const { selectedOrgId, setSelectedOrgId } = useOrgStore();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    api
      .get("/organizations/mine")
      .then((r) => {
        const fetchedOrgs = r.data.data;
        setOrgs(fetchedOrgs);
        if (fetchedOrgs.length > 0) {
          if (!fetchedOrgs.some((o: Organization) => o.id === selectedOrgId)) {
            setSelectedOrgId(fetchedOrgs[0].id);
          }
        }
      })
      .catch((err) => console.error("Failed to load orgs:", err.response?.status))
      .finally(() => setLoading(false));
  }, [hydrated, selectedOrgId, setSelectedOrgId]);

  async function handleCreate() {
    if (!orgName.trim()) { setError("Organization name is required."); return; }
    setCreating(true);
    setError("");
    try {
      const { data } = await api.post("/organizations", { name: orgName.trim() });
      const newOrg = data.data;
      setOrgs((prev) => [...prev, newOrg]);
      if (!selectedOrgId) setSelectedOrgId(newOrg.id);
      setModalOpen(false);
      setOrgName("");
      toast.success("Organization created successfully");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function handleClose() { setModalOpen(false); setOrgName(""); setError(""); }

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Manage workspaces and switch between teams."
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)} icon={Icons.plus}>
            New Organization
          </Button>
        }
        className="mb-6"
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={200} rounded="lg" />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-12">
          <EmptyState
            icon={Icons.layout}
            title="No organizations yet"
            description="Create your first organization to start scheduling interviews."
            action={
              <Button size="md" onClick={() => setModalOpen(true)}>
                Create Organization
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 page-enter">
          {orgs.map((org, idx) => {
            const isActive = org.id === selectedOrgId;
            return (
              <div
                key={org.id}
                className={cn(
                  "flex flex-col rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] p-6 transition-all",
                  isActive
                    ? "border-[var(--accent)] shadow-[var(--shadow-md)]"
                    : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="h-11 w-11 rounded-[var(--radius-md)] flex items-center justify-center text-white text-[18px] font-bold bg-[var(--accent)]"
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  {isActive && <Badge variant="success" dot size="sm">Active</Badge>}
                </div>
                <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-1">{org.name}</h3>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-5 flex-1">
                  {org._count?.interviews ?? 0} interviews · {org._count?.members ?? 0} members
                </p>
                {isActive ? (
                  <Button variant="secondary" size="sm" className="w-full justify-center" onClick={() => router.push("/dashboard/interviews")}>
                    Manage Workspace
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full justify-center" onClick={() => { setSelectedOrgId(org.id); router.push("/dashboard/interviews"); }}>
                    Switch to this Org
                  </Button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setModalOpen(true)}
            className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 min-h-[200px] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all cursor-pointer"
          >
            <div className="h-10 w-10 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] mb-3">
              {Icons.plus}
            </div>
            <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Create Organization</p>
            <p className="text-[var(--text-xs)] text-[var(--text-muted)] mt-0.5">Add a new workspace</p>
          </button>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={handleClose}
        title="New Organization"
        description="Create a workspace for your hiring team."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={handleClose}>
              Cancel
            </Button>
            <Button size="md" onClick={handleCreate} loading={creating}>
              Create Organization
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            label="Organization Name *"
            value={orgName}
            onChange={(e) => { setOrgName(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            placeholder="e.g. Acme Corp"
            error={error}
          />
        </div>
      </Modal>
    </>
  );
}
