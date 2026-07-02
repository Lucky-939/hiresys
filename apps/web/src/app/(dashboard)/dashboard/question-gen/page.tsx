"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";

export default function QuestionGenPage() {
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("mid");
  const [topics, setTopics] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<{ q: string, type: string }[] | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!role) return;
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await api.post("/ai/questions", {
        role: `${role} ${topics ? `with focus on ${topics}` : ''}`,
        difficulty: level,
      });

      const questions = data?.data || [];
      const mapped = questions.map((q: string) => ({
        q,
        type: "Technical" // Default type since API returns strings
      }));
      setGeneratedQuestions(mapped);
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 page-enter pb-12 max-w-[1200px] mx-auto w-full">

      {/* Header */}
      <div className="pb-5 border-b border-[var(--border-default)]">
        <PageHeader
          title="Interview Copilot"
          description="Generate AI-powered questions tailored to role, level, and technology stack."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Configuration Form */}
        <Card padding="default" className="lg:col-span-4 flex flex-col">
          <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
          <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">Role / Title <span className="text-[var(--danger)]">*</span></label>
              <input
                type="text" placeholder="e.g. Frontend Engineer"
                value={role} onChange={e => setRole(e.target.value)}
                className="h-9 w-full px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">Experience Level</label>
              <select
                value={level} onChange={e => setLevel(e.target.value)}
                className="h-9 w-full px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-sm)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
              >
                <option value="junior">Junior / Entry-Level</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Staff</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">Key Topics / Technologies</label>
              <textarea
                placeholder="e.g. React, Next.js, System Design"
                rows={3} value={topics} onChange={e => setTopics(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all resize-none"
              />
            </div>
            <Button className="w-full justify-center" onClick={handleGenerate} disabled={!role || loading} loading={loading}>
              {loading ? "Generating..." : "Generate Questions"}
            </Button>
          </div>
          </CardContent>
        </Card>

        {/* Right Panel: Output */}
        <Card padding="default" className="lg:col-span-8 flex flex-col min-h-[400px]">
          <CardHeader>
            <CardTitle>Generated Questions</CardTitle>
            {generatedQuestions && (
              <Button variant="ghost" size="sm" onClick={() => {
                const text = generatedQuestions.map((q, i) => `${i+1}. ${q.q}`).join("\n");
                navigator.clipboard.writeText(text);
              }}>Copy All</Button>
            )}
          </CardHeader>
          <CardContent className="flex-1">
          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="h-6 w-6 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
                <p className="text-[var(--text-sm)] text-[var(--text-muted)]">Generating questions for {role}...</p>
              </div>
            ) : !generatedQuestions ? (
              <EmptyState
                compact
                icon={Icons.fileText}
                title={error ? "Error generating questions" : "No questions yet"}
                description={error || "Configure a role on the left and click Generate."}
                action={error ? <Button size="sm" onClick={handleGenerate}>Try Again</Button> : undefined}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {generatedQuestions.map((item, idx) => (
                  <div key={idx} className="group flex items-start gap-3 p-3.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] transition-colors">
                    <span className="text-[var(--text-xs)] font-mono text-[var(--text-muted)] w-5 shrink-0 mt-0.5 tabular-nums">{idx + 1}.</span>
                    <p className="flex-1 text-[var(--text-sm)] text-[var(--text-primary)] leading-relaxed">{item.q}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(item.q)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                      title="Copy"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
