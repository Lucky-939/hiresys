"use client";

import React, { useState, useEffect } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { api } from "@/lib/api";
import { useOrganizations } from "@/components/ui/OrganizationSelector";

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const router = useRouter();
  const { selectedOrgId } = useOrganizations();
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    if (open && selectedOrgId) {
      api.get(`/candidates/org/${selectedOrgId}`)
        .then((res) => {
          if (res.data?.data) {
            setCandidates(res.data.data);
          }
        })
        .catch(console.error);
    }
  }, [open, selectedOrgId]);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={() => setOpen(false)}
      />
      
      {/* Dialog */}
      <div className="relative z-50 w-full max-w-[600px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl animate-in fade-in zoom-in-95 duration-200 mx-4">
        <Command
          className="flex h-full w-full flex-col overflow-hidden bg-transparent"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div className="flex items-center border-b border-[var(--border-default)] px-3">
            <span className="mr-2 text-[var(--text-muted)]">{Icons.search}</span>
            <Command.Input 
              autoFocus
              placeholder="Search candidates, interviews, tools..." 
              className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[var(--text-subtle)] text-[var(--text-primary)]"
            />
            <span className="text-xs text-[var(--text-subtle)] bg-[var(--bg-elevated)] px-2 py-1 rounded border border-[var(--border-subtle)]">ESC</span>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--text-muted)]">
              No candidates found.
            </Command.Empty>

            {candidates.map((c) => (
              <Command.Item
                key={c.id}
                value={`${c.name} ${c.email} ${c.role || ""}`}
                onSelect={() => { router.push(`/dashboard/candidates/${c.id}`); setOpen(false); }}
                className="flex cursor-pointer flex-col rounded-md px-2 py-2 text-sm hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] text-[var(--text-primary)] transition-colors data-[selected=true]:bg-[var(--accent-muted)] data-[selected=true]:text-[var(--accent)]"
              >
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-[var(--text-muted)] truncate">{c.email} • {c.role || "General"}</span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>

      <style>{`
        [cmdk-group-heading] {
          padding-left: 0.5rem;
          padding-top: 0.5rem;
          padding-bottom: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-subtle);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
}
