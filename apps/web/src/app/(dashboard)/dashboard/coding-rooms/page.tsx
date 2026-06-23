"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

import { useRouter } from "next/navigation";

// Mock data
const RECENT_ROOMS = [
  { id: "rm_1", candidate: "Alex Johnson", role: "Frontend Engineer", status: "COMPLETED", date: "2 hours ago", score: 85 },
  { id: "rm_2", candidate: "Sarah Williams", role: "Backend Developer", status: "COMPLETED", date: "Yesterday", score: 92 },
  { id: "rm_3", candidate: "David Chen", role: "Fullstack Engineer", status: "SCHEDULED", date: "Tomorrow, 10:00 AM" },
];

export default function CodingRoomsPage() {
  const router = useRouter();
  const [rooms] = useState(RECENT_ROOMS);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto w-full pb-12">
      
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Coding Rooms</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Create and manage live collaborative coding sessions with candidates.
          </p>
        </div>
        <Button size="md" className="gap-2" onClick={() => router.push("/dashboard/interviews")}>
          <span className="text-[16px] leading-none">+</span> New Room
        </Button>
      </div>

      {/* Stats/Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-[var(--bg-surface)] hover:border-[var(--accent-muted)] transition-colors group cursor-pointer" onClick={() => router.push("/dashboard/interviews")}>
          <div className="h-10 w-10 rounded-lg bg-[var(--accent-muted)]/20 text-[var(--accent)] flex items-center justify-center mb-4 group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
            {Icons.code}
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Start Session</h3>
          <p className="text-sm text-[var(--text-secondary)]">Instantly spin up a collaborative editor.</p>
        </Card>

        <Card className="p-6 bg-[var(--bg-surface)] hover:border-[var(--info-border)] transition-colors group cursor-pointer" onClick={() => router.push("/dashboard/interviews")}>
          <div className="h-10 w-10 rounded-lg bg-[var(--info-bg)]/20 text-[var(--info-text)] flex items-center justify-center mb-4 group-hover:bg-[var(--info-text)] group-hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Schedule Room</h3>
          <p className="text-sm text-[var(--text-secondary)]">Create a link for an upcoming interview.</p>
        </Card>

        <Card className="p-6 bg-[var(--bg-surface)] hover:border-[var(--warning-border)] transition-colors group cursor-pointer" onClick={() => router.push("/dashboard/reports")}>
          <div className="h-10 w-10 rounded-lg bg-[var(--warning-bg)]/20 text-[var(--warning-text)] flex items-center justify-center mb-4 group-hover:bg-[var(--warning-text)] group-hover:text-white transition-colors">
            {Icons.fileText}
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">View Reports</h3>
          <p className="text-sm text-[var(--text-secondary)]">Analyze AI reports from past sessions.</p>
        </Card>
      </div>

      {/* Recent Rooms List */}
      <Card className="flex flex-col bg-[var(--bg-surface)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Sessions</h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push("/dashboard/interviews")}>View All</Button>
        </div>
        
        <div className="divide-y divide-[var(--border-subtle)]">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center justify-between p-4 hover:bg-[var(--bg-elevated)] transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] font-medium text-sm">
                  {room.candidate.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">{room.candidate}</h4>
                  <p className="text-xs text-[var(--text-muted)]">{room.role}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">{room.date}</p>
                </div>
                <Badge variant={room.status === "COMPLETED" ? "success" : "warning"} className="w-24 justify-center">
                  {room.status}
                </Badge>
                {room.status === "COMPLETED" ? (
                  <Button variant="secondary" size="sm" className="h-8" onClick={() => router.push(`/dashboard/interviews`)}>Report</Button>
                ) : (
                  <Button size="sm" className="h-8 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-none" onClick={() => router.push(`/room/${room.id}`)}>Join Room</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
