"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceTemplate } from "@/components/layout/templates";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Member = {
  id: string; role: string; createdAt: string;
  user: { id: string; name: string; email: string };
};

export default function MembersPage() {
  const { user } = useAuthStore();
  const { orgs, selectedOrgId, isReady } = useOrganizations();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("RECRUITER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });

  useEffect(() => {
    if (!isReady || !selectedOrgId) { if (isReady && !selectedOrgId) setLoading(false); return; }
    setLoading(true);
    api.get(`/organizations/${selectedOrgId}/members`)
      .then(res => {
        setMembers(res.data.data.sort((a: Member, b: Member) => {
          if (a.role === "OWNER") return -1;
          if (b.role === "OWNER") return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }));
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  const currentMember = members.find(m => m.user.id === user?.id) || members[0];
  const canManage = currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await api.patch(`/organizations/${selectedOrgId}/members/${userId}/role`, { role: newRole });
      setMembers(prev => prev.map(m => m.user.id === userId ? { ...m, role: newRole } : m));
      toast.success("Role updated");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  }

  async function handleRemoveMember(userId: string) {
    setConfirmModal({ open: true, userId });
  }

  async function confirmRemoveMember() {
    if (!confirmModal.userId) return;
    try {
      await api.delete(`/organizations/${selectedOrgId}/members/${confirmModal.userId}`);
      setMembers(prev => prev.filter(m => m.user.id !== confirmModal.userId));
      toast.success("Member removed");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setConfirmModal({ open: false, userId: null }); }
  }

  async function handleInvite() {
    if (!inviteEmail) { setInviteError("Email is required"); return; }
    setInviting(true); setInviteError(""); setInviteLink("");
    try {
      const res = await api.post(`/organizations/${selectedOrgId}/members/invite`, { email: inviteEmail, role: inviteRole });
      const token = res.data.data.token;
      setInviteLink(`${window.location.origin}/invite/${token}`);
      toast.success("Invite link generated");
    } catch (err: unknown) { setInviteError(getErrorMessage(err)); }
    finally { setInviting(false); }
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function closeInviteModal() {
    setInviteModalOpen(false); setInviteEmail(""); setInviteRole("RECRUITER");
    setInviteLink(""); setInviteError(""); setCopied(false);
  }

  const ROLE_BADGE: Record<string, any> = {
    OWNER: { label: "Owner", variant: "accent"   },
    ADMIN: { label: "Admin", variant: "info"      },
    RECRUITER:{ label: "Recruiter", variant: "neutral"  },
    INTERVIEWER:{ label: "Interviewer", variant: "neutral"  },
  };

  /* â€”â€”â€” Member Table â€”â€”â€” */
  const content = (
    <div className="rounded-[var(--radius-default)] border border-[var(--border-default)] overflow-hidden bg-[var(--bg-surface)]">
      {/* Table header */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
        <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Member</span>
        <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Role</span>
        <span className="hidden md:block w-36 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Joined</span>
        {canManage && <span className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Actions</span>}
      </div>

      {/* Rows */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-divider)]">
            <Skeleton width={36} height={36} rounded="full" />
            <div className="flex-1 flex flex-col gap-1.5"><Skeleton width="40%" height={13} /><Skeleton width="55%" height={11} /></div>
            <Skeleton width={60} height={20} rounded="full" />
          </div>
        ))
      ) : members.length === 0 ? (
        <EmptyState
          compact
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          title="No team members"
          description="Invite your first team member to start collaborating."
          action={canManage ? <Button size="sm" onClick={() => setInviteModalOpen(true)}>Invite Member</Button> : undefined}
        />
      ) : (
        members.map(member => {
          const isSelf = member.user.id === user?.id;
          const isOwner = member.role === "OWNER";
          const roleCfg = ROLE_BADGE[member.role] ?? ROLE_BADGE.INTERVIEWER;
          return (
            <div key={member.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border-divider)] hover:bg-[var(--bg-elevated)] transition-colors last:border-b-0">
              {/* Member */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={member.user.name} size="sm" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {member.user.name}
                    {isSelf && <span className="ml-1.5 text-[var(--text-muted)] font-normal text-xs">(You)</span>}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] truncate">{member.user.email}</span>
                </div>
              </div>

              {/* Role */}
              <div className="w-24 shrink-0">
                <Badge variant={roleCfg.variant} size="sm">{roleCfg.label}</Badge>
              </div>

              {/* Joined */}
              <div className="hidden md:block w-36 shrink-0">
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(member.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Actions */}
              {canManage && (
                <div className="w-28 shrink-0 flex items-center justify-end gap-1.5">
                  {!isOwner && !isSelf && (
                    <>
                      <Select
                        value={member.role}
                        onChange={e => handleRoleChange(member.user.id, e.target.value)}
                        className="h-7 !py-0 !pl-2 !pr-6 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-default)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer w-[90px]"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="RECRUITER">Recruiter</option>
                        <option value="INTERVIEWER">Interviewer</option>
                      </Select>
                      <button
                        onClick={() => handleRemoveMember(member.user.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-[var(--radius-default)] text-[var(--text-muted)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors"
                        title="Remove member"
                        aria-label={`Remove ${member.user.name}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </>
                  )}
                </div>
              )}
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
            title="Team Members"
            description="Manage access and roles for your organization."
            backHref="/dashboard"
            backLabel="Back to Dashboard"
            actions={
              <div className="flex items-center gap-2">
                {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
                {canManage && (
                  <Button size="sm" onClick={() => setInviteModalOpen(true)}>Invite Member</Button>
                )}
              </div>
            }
          />
        }
        content={content}
      />

      {/* Invite Modal */}
      <Modal
        open={inviteModalOpen} onClose={closeInviteModal}
        title="Invite Team Member"
        description="Add a new member to your organization."
        footer={
          !inviteLink ? (
            <>
              <Button variant="secondary" size="md" onClick={closeInviteModal}>Cancel</Button>
              <Button size="md" onClick={handleInvite} loading={inviting}>Generate Invite Link</Button>
            </>
          ) : undefined
        }
      >
        {inviteLink ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-default)] bg-[var(--accent-muted)] border border-[var(--accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--accent)] mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <p className="text-sm font-semibold text-[var(--accent)]">Invite link ready</p>
                <p className="text-xs text-[var(--accent)] opacity-80 mt-0.5">Share this link with your colleague.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                readOnly value={inviteLink} onClick={e => (e.target as HTMLInputElement).select()}
                className="flex-1 h-9 px-3 bg-[var(--bg-sunken)] border border-[var(--border-default)] rounded-[var(--radius-default)] text-xs font-mono text-[var(--text-primary)] focus:outline-none cursor-copy"
              />
              <Button variant="outline" size="sm" onClick={copyInviteLink} className="shrink-0 w-20 justify-center">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <Button size="sm" onClick={closeInviteModal} className="mt-1">Done</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Input
              autoFocus label="Email address *" type="email"
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setInviteError(""); }}
              onKeyDown={e => { if (e.key === "Enter") handleInvite(); }}
              placeholder="colleague@company.com" error={inviteError}
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Role</label>
              {[
                { value: "RECRUITER", label: "Recruiter", desc: "Full pipeline and interview management." },
                { value: "INTERVIEWER", label: "Interviewer", desc: "Can only view assigned interviews and submit feedback." },
                { value: "ADMIN",  label: "Admin",  desc: "Full access including managing team members." },
              ].map(r => (
                <label
                  key={r.value}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-[var(--radius-default)] border cursor-pointer transition-colors",
                    inviteRole === r.value ? "bg-[var(--accent-muted)] border-[var(--accent)]" : "border-[var(--border-default)] hover:border-[var(--border-default)]"
                  )}
                >
                  <input type="radio" name="role" value={r.value} checked={inviteRole === r.value} onChange={e => setInviteRole(e.target.value)} className="mt-0.5 accent-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{r.label}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={confirmModal.open} onClose={() => setConfirmModal({ open: false, userId: null })} title="Remove Member">
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          Remove this member? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmModal({ open: false, userId: null })}>Cancel</Button>
          <Button onClick={confirmRemoveMember} className="bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white">
            Yes, remove
          </Button>
        </div>
      </Modal>
    </>
  );
}
