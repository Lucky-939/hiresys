"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  interviewId: string;
  codingScore: number;
  problemSolvingScore: number;
  technicalKnowledgeScore: number;
  overallScore: number;
  recommendation: "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE";
  aiSummary: string;
  strengths: string[];
  improvements: string[];
  generationTimeMs: number | null;
  version: number;
  createdAt: string;
  snapshotInterviewTitle: string | null;
  snapshotCodeSubmitted: string | null;
  snapshotLanguage: string | null;
  snapshotQuestions: string[] | null;
  interview: {
    id: string;
    title: string;
    status: string;
  };
}

const RECOMMENDATION_CONFIG: Record<
  string,
  { label: string; variant: "success" | "info" | "warning" | "destructive" }
> = {
  STRONG_HIRE: { label: "Strong Hire", variant: "success" },
  HIRE: { label: "Hire", variant: "info" },
  MAYBE: { label: "Maybe", variant: "warning" },
  NO_HIRE: { label: "No Hire", variant: "destructive" },
};

function ScoreRing({ score, label, colorClass, size = 110, strokeWidth = 8 }: { score: number; label: string; colorClass: string; size?: number; strokeWidth?: number; }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-[var(--border-subtle)]" strokeWidth={strokeWidth} />
          <circle 
            cx={size / 2} cy={size / 2} r={radius} fill="none" 
            className={cn("transition-all duration-1000 ease-out", colorClass)} 
            strokeWidth={strokeWidth} strokeLinecap="round" 
            strokeDasharray={circumference} strokeDashoffset={offset} 
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[var(--text-primary)] leading-none">{score}</span>
          <span className="text-[10px] font-medium text-[var(--text-disabled)]">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-[var(--text-secondary)] text-center tracking-wide">{label}</span>
    </div>
  );
}

export default function ReportPage({ params }: { params: Promise<{ id: string }>; }) {
  const { id: interviewId } = use(params);
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/reports/${interviewId}`)
      .then((r) => setReport(r.data.data))
      .catch((err) => {
        console.error(err);
        // Fallback for demo
        setReport({
          id: "1", interviewId, codingScore: 92, problemSolvingScore: 85, technicalKnowledgeScore: 88, overallScore: 88,
          recommendation: "STRONG_HIRE", aiSummary: "Candidate demonstrated excellent understanding of algorithmic principles and system design. Code was clean, optimal, and well-structured.",
          strengths: ["Strong problem-solving skills", "Clean, maintainable code", "Good communication of thought process"],
          improvements: ["Could improve on considering edge cases earlier"],
          generationTimeMs: 2500, version: 1, createdAt: new Date().toISOString(),
          snapshotInterviewTitle: "Senior Engineer Interview", snapshotCodeSubmitted: "function solution() {\n  return 'Optimized Code';\n}", snapshotLanguage: "javascript", snapshotQuestions: ["Design a rate limiter.", "Explain React Context API."],
          interview: { id: interviewId, title: "Senior Engineer Interview", status: "COMPLETED" }
        });
      })
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
        <div className="w-32 h-6 skeleton" />
        <div className="h-40 w-full skeleton rounded-xl" />
        <div className="h-40 w-full skeleton rounded-xl" />
      </div>
    );
  }

  if (!report) return null;

  const rec = RECOMMENDATION_CONFIG[report.recommendation] || RECOMMENDATION_CONFIG.MAYBE;
  const generatedDate = new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto w-full pb-12">
      
      {/* Back Link */}
      <div>
        <button onClick={() => router.back()} className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2">
          ← Back to Interviews
        </button>
      </div>

      {/* Hero Section */}
      <Card className="overflow-hidden border-t-4 border-t-[var(--accent)] shadow-md bg-[var(--bg-surface)]">
        <div className="flex flex-col md:flex-row items-center gap-8 p-8 md:p-10">
          <ScoreRing score={report.overallScore} label="Overall Score" colorClass="stroke-[var(--success-text)]" size={160} strokeWidth={12} />
          <div className="flex-1 flex flex-col justify-center text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
              {report.snapshotInterviewTitle || report.interview?.title || "Interview Report"}
            </h1>
            <p className="text-sm text-[var(--text-tertiary)] mb-6 flex items-center justify-center md:justify-start gap-2">
              Generated on {generatedDate}
              {report.generationTimeMs != null && (
                <span className="flex items-center gap-1 ml-2 bg-[var(--bg-base)] px-2 py-0.5 rounded-md border border-[var(--border-default)]">
                  {Icons.clock} {(report.generationTimeMs / 1000).toFixed(1)}s
                </span>
              )}
            </p>
              <Badge variant={rec.variant} className="text-sm px-4 py-1.5 uppercase tracking-wider font-bold shadow-sm">
                {rec.label}
              </Badge>
          </div>
        </div>
      </Card>

      {/* Categories Breakdown */}
      <Card className="p-8">
        <h3 className="text-xs font-bold text-[var(--text-disabled)] uppercase tracking-widest mb-6">Score Breakdown</h3>
        <div className="flex flex-wrap items-center justify-around gap-8">
          <ScoreRing score={report.codingScore} label="Coding" colorClass="stroke-[var(--accent)]" />
          <ScoreRing score={report.problemSolvingScore} label="Problem Solving" colorClass="stroke-[var(--info-text)]" />
          <ScoreRing score={report.technicalKnowledgeScore} label="Technical Knowledge" colorClass="stroke-[var(--warning-text)]" />
        </div>
      </Card>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-[var(--success-border)]/30 bg-[var(--success-bg)]/5">
          <h3 className="text-xs font-bold text-[var(--success-text)] uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="bg-[var(--success-text)] text-white rounded-full p-0.5">{Icons.check}</span> Strengths
          </h3>
          <div className="space-y-3">
            {report.strengths.length > 0 ? report.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--success-bg)]/20 border border-[var(--success-border)]/20">
                <span className="text-[var(--success-text)] mt-0.5 shrink-0">{Icons.check}</span>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{s}</p>
              </div>
            )) : <p className="text-sm text-[var(--text-tertiary)] italic">No strengths identified.</p>}
          </div>
        </Card>

        <Card className="p-6 border-[var(--warning-border)]/30 bg-[var(--warning-bg)]/5">
          <h3 className="text-xs font-bold text-[var(--warning-text)] uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="bg-[var(--warning-text)] text-white rounded-full p-0.5" style={{ transform: "rotate(90deg)" }}>{Icons.arrow}</span> Areas for Improvement
          </h3>
          <div className="space-y-3">
            {report.improvements.length > 0 ? report.improvements.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--warning-bg)]/20 border border-[var(--warning-border)]/20">
                <span className="text-[var(--warning-text)] mt-0.5 shrink-0" style={{ transform: "rotate(90deg)" }}>{Icons.arrow}</span>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{s}</p>
              </div>
            )) : <p className="text-sm text-[var(--text-tertiary)] italic">No areas for improvement identified.</p>}
          </div>
        </Card>
      </div>

      {/* AI Summary */}
      <Card className="p-6 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-elevated)]">
        <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-3 flex items-center gap-2">
          AI Summary
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{report.aiSummary}</p>
      </Card>

      {/* Accordions */}
      <div className="space-y-4">
        {report.snapshotCodeSubmitted && (
          <details className="group border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-xl overflow-hidden shadow-sm">
            <summary className="p-4 text-sm font-semibold text-[var(--text-primary)] cursor-pointer list-none flex items-center gap-3 select-none hover:bg-[var(--bg-elevated)] transition-colors">
              <span className="text-[var(--text-disabled)] transition-transform group-open:rotate-90">▶</span>
              Submitted Code
              {report.snapshotLanguage && <Badge variant="neutral" className="ml-2 font-mono text-[10px]">{report.snapshotLanguage}</Badge>}
            </summary>
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]">
              <pre className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg overflow-x-auto text-xs font-mono text-[var(--text-primary)] leading-relaxed">
                <code>{report.snapshotCodeSubmitted}</code>
              </pre>
            </div>
          </details>
        )}

        {report.snapshotQuestions && report.snapshotQuestions.length > 0 && (
          <details className="group border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-xl overflow-hidden shadow-sm">
            <summary className="p-4 text-sm font-semibold text-[var(--text-primary)] cursor-pointer list-none flex items-center gap-3 select-none hover:bg-[var(--bg-elevated)] transition-colors">
              <span className="text-[var(--text-disabled)] transition-transform group-open:rotate-90">▶</span>
              Interview Questions Asked
            </summary>
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]">
              <ul className="space-y-2 list-disc list-inside text-sm text-[var(--text-secondary)] leading-relaxed">
                {report.snapshotQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          </details>
        )}
      </div>

    </div>
  );
}
