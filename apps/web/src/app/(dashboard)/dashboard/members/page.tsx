"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { Icons } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Member = {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-rose-600", "bg-orange-600", "bg-indigo-600"
];

function Avatar({ name, size = 40, isOwner = false, seed = 0 }: { name: string; size?: number; isOwner?: boolean; seed?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const bgColorClass = isOwner ? "bg-[var(--accent)]" : AVATAR_COLORS[seed % AVATAR_COLORS.length];
  
  return (
    <div
      className={cn("flex items-center justify-center rounded-full text-white font-bold shrink-0 shadow-sm", bgColorClass)}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

export default function MembersPage() {
  const { user } = useAuthStore();
  const { orgs, selectedOrgId, isReady } = useOrganizations();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isReady || !selectedOrgId) {
      if (isReady && !selectedOrgId) setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/organizations/${selectedOrgId}/members`)
      .then((res) => {
        setMembers(res.data.data.sort((a: Member, b: Member) => {
          if (a.role === "OWNER") return -1;
          if (b.role === "OWNER") return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }));
      })
      .catch((err) => {
        console.error(err);
        setMembers([]);
      })
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  const currentMember = members.find((m) => m.user.id === user?.id) || members[0];
  const canManage = currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await api.patch(`/organizations/${selectedOrgId}/members/${userId}/role`, { role: newRole });
      setMembers((prev) => prev.map((m) => (m.user.id === userId ? { ...m, role: newRole } : m)));
      toast.success("Role updated successfully");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await api.delete(`/organizations/${selectedOrgId}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
      toast.success("Member removed successfully");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleInvite() {
    if (!inviteEmail) {
      setInviteError("Email is required");
      return;
    }
    setInviting(true);
    setInviteError("");
    setInviteLink("");
    try {
      const res = await api.post(`/organizations/${selectedOrgId}/members/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      const token = res.data.data.token;
      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);
      setInviting(false);
      toast.success("Invite link generated successfully!");
    } catch (err: unknown) {
      setInviteError(getErrorMessage(err));
      setInviting(false);
    }
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeInviteModal() {
    setInviteModalOpen(false);
    setInviteEmail("");
    setInviteRole("MEMBER");
    setInviteLink("");
    setInviteError("");
    setCopied(false);
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto w-full pb-12">
      
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Team Members</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage who has access to your organization.</p>
        </div>

        <div className="flex items-center gap-4">
          {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
          {canManage && (
            <Button size="md" onClick={() => setInviteModalOpen(true)} className="gap-2">
              <span className="text-[16px] leading-none">+</span> Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-sm overflow-hidden">
        
        {/* Table Header */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] p-4 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
          <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">User</span>
          <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider hidden md:block">Role</span>
          <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider text-right hidden md:block">Joined / Actions</span>
        </div>

        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-[var(--border-subtle)] rounded-lg skeleton h-[72px]" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center text-[var(--text-disabled)] mb-4">
              {Icons.users}
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No members found</h3>
            <p className="text-xs text-[var(--text-muted)]">Get started by inviting your team.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {members.map((member) => {
              const isOwner = member.role === "OWNER";
              const isSelf = member.user.id === user?.id;

              return (
                <div key={member.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] items-center p-4 hover:bg-[var(--bg-elevated)] transition-colors gap-4">
                  
                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <Avatar name={member.user.name} isOwner={isOwner} seed={member.user.name.length} />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                        {member.user.name} {isSelf && <span className="text-[var(--text-tertiary)] font-normal ml-1">(You)</span>}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{member.user.email}</p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="hidden md:flex items-center">
                    {isOwner ? (
                      <Badge variant="accent" className="font-mono shadow-sm">Owner</Badge>
                    ) : member.role === "ADMIN" ? (
                      <Badge variant="info" className="font-mono shadow-sm">Admin</Badge>
                    ) : (
                      <Badge variant="neutral" className="font-mono shadow-sm">Member</Badge>
                    )}
                  </div>

                  {/* Actions / Date */}
                  <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                    {canManage && !isOwner && !isSelf ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user.id, e.target.value)}
                          className="px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-base)] border border-[var(--border-default)] rounded-md outline-none cursor-pointer hover:border-[var(--border-strong)] transition-colors focus:ring-1 focus:ring-[var(--accent)]"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user.id)}
                          className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)]/20 transition-colors"
                          title="Remove member"
                        >
                          {Icons.trash}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-[var(--text-tertiary)] text-right w-full md:w-auto">
                        {new Date(member.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={closeInviteModal}
        title="Invite Team Member"
        description="Add a new member to your organization to start collaborating."
        footer={
          !inviteLink && (
            <div className="flex justify-end gap-3 w-full">
              <Button variant="secondary" onClick={closeInviteModal}>Cancel</Button>
              <Button onClick={handleInvite} loading={inviting}>Create Invite Link</Button>
            </div>
          )
        }
      >
        {inviteLink ? (
          <div className="flex flex-col gap-4">
            <div className="bg-[var(--success-bg)]/20 border border-[var(--success-border)] rounded-lg p-4 flex items-start gap-3">
              <div className="text-[var(--success-text)] mt-0.5">{Icons.check}</div>
              <div>
                <p className="text-sm font-semibold text-[var(--success-text)] mb-1">Invite link generated!</p>
                <p className="text-xs text-[var(--success-text)]/80">Share this link with your colleague to grant them access.</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-md text-sm text-[var(--text-primary)] font-mono outline-none cursor-copy"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button variant="secondary" onClick={copyInviteLink} className="gap-2 shrink-0 w-[100px] justify-center">
                {copied ? Icons.check : Icons.copy}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            
            <Button className="w-full mt-2" onClick={closeInviteModal}>Done</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <Input
              autoFocus
              label="Email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }}
              placeholder="colleague@company.com"
              error={inviteError}
            />

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">Role</label>
              <div className="grid grid-cols-1 gap-3">
                <label className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  inviteRole === "MEMBER" ? "bg-[var(--accent-muted)]/10 border-[var(--accent)]" : "bg-[var(--bg-base)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
                )}>
                  <input 
                    type="radio" 
                    name="role" 
                    value="MEMBER" 
                    checked={inviteRole === "MEMBER"}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Member</h4>
                    <p className="text-xs text-[var(--text-muted)]">Can conduct interviews, view candidates, and generate AI reports.</p>
                  </div>
                </label>
                
                <label className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  inviteRole === "ADMIN" ? "bg-[var(--accent-muted)]/10 border-[var(--accent)]" : "bg-[var(--bg-base)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
                )}>
                  <input 
                    type="radio" 
                    name="role" 
                    value="ADMIN" 
                    checked={inviteRole === "ADMIN"}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Admin</h4>
                    <p className="text-xs text-[var(--text-muted)]">Full access including managing team members and organizational settings.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
