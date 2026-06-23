"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useOrgStore } from "@/store/org.store";
import { Icons } from "@/components/ui/Icons";
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

const AVATAR_COLORS = ["#0284C7", "#059669", "#7C3AED", "#DC2626", "#EA580C", "#4F46E5"];

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
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
            Your Organizations
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-tertiary)", margin: 0 }}>
            Manage workspaces and switch between teams.
          </p>
        </div>
        <Button size="md" onClick={() => setModalOpen(true)} icon={Icons.plus}>
          New Organization
        </Button>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid var(--border-subtle)", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: "48px 0" }}>
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
        <div className="animate-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
          {orgs.map((org, idx) => {
            const isActive = org.id === selectedOrgId;
            return (
              <div
                key={org.id}
                style={{
                  background: "#FFFFFF",
                  border: isActive ? "2px solid var(--accent)" : "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.05)" : "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "all var(--ease-base)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "10px",
                      background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      fontWeight: 700,
                    }}
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  {isActive && <Badge variant="success" dot>Active</Badge>}
                </div>

                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px" }}>
                  {org.name}
                </h3>
                
                <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: "0 0 24px", flex: 1 }}>
                  {org._count?.interviews ?? 0} interviews · {org._count?.members ?? 0} members
                </p>

                <div style={{ display: "flex", gap: "12px" }}>
                  {isActive ? (
                    <Button
                      variant="secondary"
                      style={{ width: "100%" }}
                      onClick={() => router.push(`/dashboard/interviews`)}
                    >
                      Manage Workplace
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      style={{ width: "100%" }}
                      onClick={() => {
                        setSelectedOrgId(org.id);
                        router.push(`/dashboard/interviews`);
                      }}
                    >
                      Switch to Organization
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          <div
            onClick={() => setModalOpen(true)}
            style={{
              background: "#FAFAFA",
              border: "1px dashed var(--border-default)",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all var(--ease-base)",
              minHeight: "220px",
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLDivElement).style.background = "#F8FAFC"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-default)"; (e.currentTarget as HTMLDivElement).style.background = "#FAFAFA"; }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#FFFFFF",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                color: "var(--text-secondary)",
              }}
            >
              {Icons.plus}
            </div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Create Organization
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: 0 }}>
              Add a new workspace
            </p>
          </div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
