"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

import { useOrganizations } from "@/components/ui/OrganizationSelector";
import { Icons } from "@/components/ui/Icons";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type OrgDetails = {
  id: string; name: string; slug: string; plan: string; createdAt: string;
  members: { role: string; userId: string }[];
};

export default function OrganizationSettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { selectedOrgId, isReady, refreshOrgs } = useOrganizations();
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!isReady || !selectedOrgId) { if (isReady && !selectedOrgId) setLoading(false); return; }
    setLoading(true);
    api.get(`/organizations/${selectedOrgId}`)
      .then(res => { setOrg(res.data.data); setName(res.data.data.name); })
      .catch(() => toast.error("Failed to load organization settings"))
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  const currentMember = org?.members.find(m => m.userId === user?.id);
  const canManage = currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Organization name cannot be empty"); return; }
    setSaving(true);
    try {
      await api.patch(`/organizations/${selectedOrgId}`, { name });
      toast.success("Organization updated");
      refreshOrgs();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 max-w-[var(--settings-max-width)]">
        <Skeleton width="40%" height={20} />
        <Skeleton width="100%" height={120} rounded="md" />
        <Skeleton width="100%" height={80} rounded="md" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">Organization not found or failed to load.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.refresh()}>Retry</Button>
      </div>
    );
  }

  const PLAN_LABEL: Record<string, string> = {
    FREE: "Free", PRO: "Pro", ENTERPRISE: "Enterprise",
  };

  return (
    <div className="flex flex-col gap-5 max-w-[var(--settings-max-width)]">

          {/* Your Profile */}
          <Card padding="default">
            <CardHeader><CardTitle>Your Profile</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar name={user?.name || "U"} size="lg" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-semibold text-[var(--text-primary)]">{user?.name}</span>
                  <span className="text-sm text-[var(--text-muted)]">{user?.email}</span>
                  <Badge variant="neutral" size="sm" className="mt-1 w-fit">
                    {currentMember?.role ?? "Member"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Info */}
          <Card padding="default">
            <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Organization Name</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={!canManage || saving}
                    placeholder="Acme Corp"
                  />
                  {!canManage && (
                    <p className="text-xs text-[var(--text-muted)]">Only owners and admins can edit the organization name.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Slug</span>
                    <span className="text-sm font-mono text-[var(--text-secondary)]">{org.slug}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Plan</span>
                    <span className="text-sm text-[var(--text-secondary)]">{PLAN_LABEL[org.plan] ?? org.plan}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Members</span>
                    <span className="text-sm text-[var(--text-secondary)]">{org.members.length} member{org.members.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Created</span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {new Date(org.createdAt).toLocaleDateString([], { month: "long", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex justify-end pt-2 border-t border-[var(--border-divider)]">
                    <Button size="sm" onClick={handleSave} loading={saving} disabled={name === org.name}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team quick access */}
          <Card padding="default">
            <CardHeader><CardTitle>Team Management</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  {org.members.length} member{org.members.length !== 1 ? "s" : ""} in this organization. Manage roles and invite new members.
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/members")}>
                  Manage Team
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
  );
}
