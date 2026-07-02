"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkspaceTemplate } from "@/components/layout/templates";

export default function AIFeedbackPage() {
  const router = useRouter();
  return (
    <WorkspaceTemplate
      header={
        <PageHeader
          title="AI Feedback"
          description="Review AI-generated insights and hiring recommendations from completed interviews."
          actions={
            <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/interviews")}>
              View Interviews
            </Button>
          }
        />
      }
      content={
        <EmptyState
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          }
          title="No AI feedback yet"
          description="Complete a coding interview to receive AI-powered performance analysis, scoring breakdowns, and hiring recommendations."
          action={
            <Button size="sm" onClick={() => router.push("/dashboard/interviews")}>
              Go to Interviews
            </Button>
          }
        />
      }
    />
  );
}
