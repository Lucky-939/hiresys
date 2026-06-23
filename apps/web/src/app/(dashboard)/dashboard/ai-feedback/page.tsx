"use client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";

export default function AIFeedbackPage() {
  const router = useRouter();
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>
            AI Feedback
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
            Review AI-generated feedback and insights from completed interviews
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/dashboard/interviews")}>View all feedback</Button>
      </div>

      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z" />
          </svg>
        }
        title="No AI feedback yet"
        description="Complete interviews to receive AI-powered feedback including performance analysis, scoring breakdown, and hiring recommendations."
        action={<Button size="sm" onClick={() => router.push("/dashboard/interviews")}>Go to interviews</Button>}
      />
    </>
  );
}
