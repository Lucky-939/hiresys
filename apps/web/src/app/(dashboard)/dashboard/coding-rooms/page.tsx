"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceTemplate } from "@/components/layout/templates";
import { useOrganizations, OrganizationSelector } from "@/components/ui/OrganizationSelector";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  SCHEDULED:  { label: "Scheduled",  variant: "info"    },
  ACTIVE:     { label: "Live",        variant: "danger"  },
  COMPLETED:  { label: "Completed",  variant: "neutral" },
  CANCELLED:  { label: "Cancelled",  variant: "neutral" },
};

type Interview = {
  id: string; title: string; status: string; createdAt: string;
  createdBy: { name: string };
  candidate?: { name: string; email?: string } | null;
};

export default function CodingRoomsPage() {
  const router = useRouter();
  const { orgs, selectedOrgId, isReady } = useOrganizations();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !selectedOrgId) { if (isReady && !selectedOrgId) setLoading(false); return; }
    setLoading(true);
    api.get(`/interviews/org/${selectedOrgId}`)
      .then(res => setInterviews(
        res.data.data
          .filter((iv: any) => iv.status !== "CANCELLED")
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ))
      .catch(err => { toast.error(getErrorMessage(err)); setInterviews([]); })
      .finally(() => setLoading(false));
  }, [selectedOrgId, isReady]);

  const tableHeader = (
    <div className="flex items-center gap-4 px-5 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border-default)] rounded-t-[var(--radius-lg)]">
      <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</span>
      <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Session</span>
      <span className="hidden md:block w-32 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Created</span>
      <span className="shrink-0 w-[100px] text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Action</span>
    </div>
  );

  const toolbar = (
    <div className="flex items-center gap-2 ml-auto">
      {orgs.length > 1 && <OrganizationSelector orgs={orgs} />}
      <Button size="sm" onClick={() => router.push("/dashboard/interviews")}>
        New Interview
      </Button>
    </div>
  );

  const content = (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-hidden bg-[var(--bg-surface)]">
      {tableHeader}

      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <Skeleton width={64} height={20} rounded="full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton width="45%" height={13} />
              <Skeleton width="30%" height={11} />
            </div>
            <Skeleton width={80} height={30} rounded="md" />
          </div>
        ))
      ) : interviews.length === 0 ? (
        <EmptyState
          compact
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>}
          title="No coding rooms yet"
          description="Create an interview to start a live coding session with a candidate."
          action={<Button size="sm" onClick={() => router.push("/dashboard/interviews")}>Create Interview</Button>}
        />
      ) : (
        interviews.map(iv => {
          const status = STATUS_MAP[iv.status] ?? STATUS_MAP.SCHEDULED;
          const isLive = iv.status === "ACTIVE";
          const isCompleted = iv.status === "COMPLETED";
          return (
            <div
              key={iv.id}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors last:border-b-0 group"
            >
              {/* Status */}
              <div className="w-20 shrink-0">
                <Badge variant={status.variant} dot size="sm">{status.label}</Badge>
              </div>

              {/* Session info */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => router.push(`/room/${iv.id}`)}
                  className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors text-left truncate block"
                >
                  {iv.title}
                </button>
                {iv.candidate && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Avatar name={iv.candidate.name} size="xs" />
                    <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] truncate">{iv.candidate.name}</span>
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="hidden md:block w-32 shrink-0">
                <span className="text-[var(--text-xs)] text-[var(--text-muted)]">
                  {new Date(iv.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Action */}
              <div className="shrink-0">
                {isCompleted ? (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/interviews/${iv.id}/report`)}>
                    View Report
                  </Button>
                ) : isLive ? (
                  <Button size="sm" onClick={() => router.push(`/room/${iv.id}`)} className="bg-[var(--danger)] hover:bg-[var(--danger-hover,#DC2626)] text-white border-none">
                    Join Live
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/room/${iv.id}`)}>
                    Enter Room
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <WorkspaceTemplate
      header={
        <PageHeader
          title="Coding Rooms"
          description="Live collaborative coding sessions. Enter a room to start a technical interview."
          actions={<Button size="sm" onClick={() => router.push("/dashboard/interviews")}>New Interview</Button>}
        />
      }
      toolbar={toolbar}
      content={content}
    />
  );
}
