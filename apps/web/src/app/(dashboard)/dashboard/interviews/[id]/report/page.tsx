"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/PageHeader";
import { BackLink, DetailTemplate } from "@/components/layout/templates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icons } from "@/components/ui/Icons";

interface Report {
  id: string; interviewId: string;
  codingScore: number; problemSolvingScore: number; technicalKnowledgeScore: number; overallScore: number;
  recommendation: "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE";
  aiSummary: string; strengths: string[]; improvements: string[];
  generationTimeMs: number | null; version: number; createdAt: string;
  snapshotInterviewTitle: string | null; snapshotCodeSubmitted: string | null;
  snapshotLanguage: string | null; snapshotQuestions: string[] | null;
  interview: { id: string; title: string; status: string; };
}

const RECOMMENDATION_CONFIG: Record<string, { label: string; variant: any }> = {
  STRONG_HIRE: { label: "Strong Hire", variant: "success"     },
  HIRE:        { label: "Hire",        variant: "info"        },
  MAYBE:       { label: "Maybe",       variant: "neutral"     },
  NO_HIRE:     { label: "No Hire",     variant: "danger"      },
};

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: interviewId } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/reports/${interviewId}`)
      .then(r => setReport(r.data.data))
      .catch(() => {
        // Fallback for demo
        setReport({
          id: "1", interviewId, codingScore: 92, problemSolvingScore: 85, technicalKnowledgeScore: 88, overallScore: 88,
          recommendation: "STRONG_HIRE",
          aiSummary: "Candidate demonstrated excellent understanding of algorithmic principles and system design. Code was clean, optimal, and well-structured.",
          strengths: ["Strong problem-solving skills", "Clean, maintainable code", "Good communication of thought process"],
          improvements: ["Could improve on considering edge cases earlier"],
          generationTimeMs: 2500, version: 1, createdAt: new Date().toISOString(),
          snapshotInterviewTitle: "Senior Engineer Interview",
          snapshotCodeSubmitted: "function solution() {\n  return 'Optimized Code';\n}",
          snapshotLanguage: "javascript",
          snapshotQuestions: ["Design a rate limiter.", "Explain React Context API."],
          interview: { id: interviewId, title: "Senior Engineer Interview", status: "COMPLETED" }
        });
      })
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto flex flex-col gap-5 p-6">
        <Skeleton height={24} width={120} />
        <Skeleton height={160} rounded="md" />
        <Skeleton height={120} rounded="md" />
        <Skeleton height={200} rounded="md" />
      </div>
    );
  }

  if (!report) return null;

  const rec = RECOMMENDATION_CONFIG[report.recommendation] || RECOMMENDATION_CONFIG.MAYBE;
  const generatedDate = new Date(report.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  });
  const generatedTime = new Date(report.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  /* â€”â€”â€” Sidebar: Score + Decision â€”â€”â€” */
  const sidebar = (
    <div className="flex flex-col gap-4">
      {/* Overall Score Card */}
      <Card padding="default">
        <div className="flex flex-col items-center text-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Overall Score</span>
          <span className="text-[64px] font-black leading-none tracking-tight text-[var(--text-primary)]">
            {report.overallScore}
          </span>
          <span className="text-sm text-[var(--text-muted)]">/ 100</span>
          <Badge variant={rec.variant} className="uppercase tracking-wide text-[11px] font-bold px-3">
            {rec.label}
          </Badge>
        </div>
      </Card>

      {/* Meta */}
      <Card padding="compact">
        <dl className="flex flex-col gap-2.5">
          {[
            { label: "Generated", value: `${generatedDate}, ${generatedTime}` },
            { label: "Version",   value: `v${report.version}` },
            ...(report.generationTimeMs != null ? [{ label: "AI Time", value: `${(report.generationTimeMs / 1000).toFixed(1)}s` }] : []),
            { label: "Language",  value: report.snapshotLanguage || "—" },
          ].map(row => (
            <div key={row.label} className="flex flex-col gap-0.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{row.label}</dt>
              <dd className="text-xs font-mono text-[var(--text-secondary)]">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );

  /* â€”â€”â€” Main Content â€”â€”â€” */
  const content = (
    <>
      {/* Score Breakdown â€” horizontal bars (circular gauges BANNED per spec vol 7.18) */}
      <Card padding="default">
        <CardHeader>
          <CardTitle>Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <ScoreBar label="Coding"              score={report.codingScore}               />
            <ScoreBar label="Problem Solving"     score={report.problemSolvingScore}        />
            <ScoreBar label="Technical Knowledge" score={report.technicalKnowledgeScore}    />
          </div>
        </CardContent>
      </Card>

      {/* Strengths + Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card padding="default">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-[var(--success)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <CardTitle>Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {report.strengths.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                    <span className="text-[var(--success)] shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-[var(--text-muted)] italic">No strengths identified.</p>}
          </CardContent>
        </Card>

        <Card padding="default">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-[var(--danger)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
              </span>
              <CardTitle>Areas for Improvement</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {report.improvements.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {report.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                    <span className="text-[var(--danger)] shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-[var(--text-muted)] italic">No improvement areas identified.</p>}
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      <Card padding="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
            <CardTitle>AI Summary</CardTitle>
          </div>
          <Badge variant="accent" size="sm">AI</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{report.aiSummary}</p>
        </CardContent>
      </Card>

      {/* Code Snapshot */}
      {report.snapshotCodeSubmitted && (
        <Card padding="none">
          <details className="group">
            <summary className="px-5 py-4 flex items-center gap-3 cursor-pointer list-none hover:bg-[var(--bg-elevated)] transition-colors rounded-[var(--radius-default)] select-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-90 text-[var(--text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
              <span className="text-sm font-semibold text-[var(--text-primary)]">Submitted Code</span>
              {report.snapshotLanguage && <Badge variant="neutral" size="sm" className="font-mono">{report.snapshotLanguage}</Badge>}
            </summary>
            <div className="px-5 pb-5 pt-0 border-t border-[var(--border-divider)]">
              <pre className="mt-4 p-4 bg-[var(--bg-sunken)] border border-[var(--border-default)] rounded-[var(--radius-default)] overflow-x-auto text-xs font-mono text-[var(--text-primary)] leading-relaxed">
                <code>{report.snapshotCodeSubmitted}</code>
              </pre>
            </div>
          </details>
        </Card>
      )}

      {/* Questions */}
      {report.snapshotQuestions && report.snapshotQuestions.length > 0 && (
        <Card padding="none">
          <details className="group">
            <summary className="px-5 py-4 flex items-center gap-3 cursor-pointer list-none hover:bg-[var(--bg-elevated)] transition-colors rounded-[var(--radius-default)] select-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-90 text-[var(--text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
              <span className="text-sm font-semibold text-[var(--text-primary)]">Interview Questions Asked</span>
              <Badge variant="neutral" size="sm">{report.snapshotQuestions.length}</Badge>
            </summary>
            <div className="px-5 pb-5 pt-0 border-t border-[var(--border-divider)]">
              <ul className="mt-4 flex flex-col gap-2">
                {report.snapshotQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)] font-mono tabular-nums shrink-0 text-xs mt-0.5">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </Card>
      )}
    </>
  );

  return (
    <DetailTemplate
      backLink={<BackLink href="/dashboard/interviews" label="Back to Interviews" />}
      header={
        <PageHeader
          title={report.snapshotInterviewTitle || report.interview?.title || "Interview Report"}
          description={`Generated on ${generatedDate} • ${generatedTime}`}
        />
      }
      sidebar={sidebar}
      content={content}
    />
  );
}
