"use client";

import React, { use } from "react";
import { CandidateProfileContent } from "@/components/candidates/CandidateProfileContent";
import { BackLink } from "@/components/layout/templates";

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-12">
      <div>
        <BackLink href="/dashboard/candidates" label="Back to Candidates" />
      </div>

      <CandidateProfileContent candidateId={id} layout="full" />
    </div>
  );
}