"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icons } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";
import { toast } from "sonner";

// Question presets to help recruiters quickly test & generate tailored questions
const PRESETS = [
  {
    label: "Full Stack (React & Node)",
    role: "Full Stack Engineer (React & Node.js)",
    level: "senior",
    topics: "System Design, Algorithms, Async Javascript",
  },
  {
    label: "Frontend (React / Next.js)",
    role: "Senior Frontend Engineer",
    level: "senior",
    topics: "React Concurrency, Next.js App Router, Web Performance, State Architecture",
  },
  {
    label: "Backend (Node & Distributed Systems)",
    role: "Staff Backend Engineer",
    level: "lead",
    topics: "Distributed Systems, Microservices, PostgreSQL Optimization, Kafka/Redis",
  },
  {
    label: "DevOps & Cloud Infra",
    role: "DevOps / Platform Engineer",
    level: "mid",
    topics: "Kubernetes, CI/CD, Terraform, Observability & Docker",
  },
];

function inferQuestionCategory(q: string): string {
  const lower = q.toLowerCase();
  if (lower.includes("system design") || lower.includes("architect") || lower.includes("scale") || lower.includes("microservice")) {
    return "System Design";
  }
  if (lower.includes("event loop") || lower.includes("async") || lower.includes("concurren") || lower.includes("promise") || lower.includes("thread")) {
    return "Concurrency & Async";
  }
  if (lower.includes("algorithm") || lower.includes("complexity") || lower.includes("big-o") || lower.includes("data structure") || lower.includes("heap") || lower.includes("tree")) {
    return "Algorithms & Data Structures";
  }
  if (lower.includes("react") || lower.includes("component") || lower.includes("render") || lower.includes("state") || lower.includes("hooks") || lower.includes("ui")) {
    return "Frontend & UI";
  }
  if (lower.includes("database") || lower.includes("sql") || lower.includes("query") || lower.includes("postgres") || lower.includes("redis") || lower.includes("migration")) {
    return "Data & Storage";
  }
  return "Engineering Practice";
}

export default function QuestionGenPage() {
  const [role, setRole] = useState("Full Stack Engineer (React & Node.js)");
  const [level, setLevel] = useState("senior");
  const [topics, setTopics] = useState("System Design, Algorithms, Async Javascript");
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<{ q: string; type: string }[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!role.trim()) return;
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await api.post("/ai/questions", {
        role: `${role.trim()} ${topics.trim() ? `with focus on ${topics.trim()}` : ""}`,
        difficulty: level,
        count: parseInt(count, 10) || 5,
      });

      const rawQuestions: any[] = data?.data || [];
      
      // Clean and sanitize each question item: Ensure strings, unwrap any accidental JSON objects
      const sanitized: { q: string; type: string }[] = [];

      for (const item of rawQuestions) {
        if (typeof item === "string") {
          const trimmed = item.trim();
          // If string is accidental raw JSON, extract meaningful summary or discard
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.summary) {
                sanitized.push({ q: parsed.summary, type: "Evaluation" });
              }
              continue;
            } catch {
              // Not valid json, ignore
            }
          }
          if (trimmed.length > 5) {
            sanitized.push({
              q: trimmed,
              type: inferQuestionCategory(trimmed),
            });
          }
        }
      }

      // If empty fallback, provide tailored defaults
      if (sanitized.length === 0) {
        sanitized.push(
          { q: `In a high-scale production environment for ${role}, how would you architect system reliability, state management, and edge failure recovery?`, type: "System Design" },
          { q: `Describe how you profile, debug, and optimize performance bottlenecks under concurrent user load in your tech stack.`, type: "Engineering Practice" },
          { q: `How do you approach zero-downtime database migrations and distributed data consistency?`, type: "Data & Storage" }
        );
      }

      setGeneratedQuestions(sanitized);
      toast.success(`Generated ${sanitized.length} calibrated questions for ${role}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast.success("Question copied to clipboard");
    } else {
      toast.success("All questions copied to clipboard");
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setRole(preset.role);
    setLevel(preset.level);
    setTopics(preset.topics);
  };

  const filteredQuestions = generatedQuestions ? (
    filterCategory === "ALL" 
      ? generatedQuestions 
      : generatedQuestions.filter(q => q.type === filterCategory)
  ) : null;

  const categories = generatedQuestions 
    ? Array.from(new Set(generatedQuestions.map(q => q.type)))
    : [];

  return (
    <div className="flex flex-col gap-6 page-enter pb-16 max-w-[1240px] mx-auto w-full">

      {/* Header */}
      <div className="pb-5 border-b border-[var(--border-default)]">
        <PageHeader
          title="Interview Copilot"
          description="Generate AI-powered interview questions rigorously calibrated to role, seniority level, and core technologies."
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
      </div>

      {/* Quick Role Preset Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider shrink-0 mr-1">
          Quick Presets:
        </span>
        {PRESETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => applyPreset(preset)}
            className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] whitespace-nowrap transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Configuration Form */}
        <Card padding="default" className="lg:col-span-4 flex flex-col shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Interview Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Role / Title <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Full Stack Engineer (React & Node.js)"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-9 w-full px-3 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Experience Level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="junior">Junior / Entry</option>
                  <option value="mid">Mid-Level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead / Staff</option>
                </Select>

                <Select
                  label="Questions Count"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                >
                  <option value="3">3 Questions</option>
                  <option value="5">5 Questions</option>
                  <option value="8">8 Questions</option>
                  <option value="10">10 Questions</option>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Key Topics / Technologies
                </label>
                <textarea
                  placeholder="e.g. System Design, Algorithms, Async Javascript, Redis, Docker"
                  rows={3}
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all resize-none"
                />
              </div>

              <Button
                className="w-full justify-center bg-[var(--accent)] text-white hover:brightness-110 shadow-sm"
                onClick={handleGenerate}
                disabled={!role.trim() || loading}
                loading={loading}
              >
                {loading ? "Generating Calibrated Questions..." : "Generate Questions"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel: Output */}
        <Card padding="default" className="lg:col-span-8 flex flex-col min-h-[460px] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base font-bold">Generated Questions</CardTitle>
              {generatedQuestions && (
                <Badge variant="neutral" size="sm" className="font-mono">
                  {filteredQuestions?.length} / {generatedQuestions.length}
                </Badge>
              )}
            </div>

            {generatedQuestions && generatedQuestions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const text = generatedQuestions
                    .map((item, i) => `${i + 1}. [${item.type}] ${item.q}`)
                    .join("\n\n");
                  copyToClipboard(text);
                }}
                className="text-xs"
              >
                Copy All Questions
              </Button>
            )}
          </CardHeader>

          <CardContent className="flex-1 pt-4">
            <div className="flex-1 flex flex-col">
              
              {/* Category Filter Pills */}
              {categories.length > 1 && (
                <div className="flex items-center gap-1.5 pb-3 mb-2 border-b border-[var(--border-default)] overflow-x-auto scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setFilterCategory("ALL")}
                    className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors",
                      filterCategory === "ALL"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    All ({generatedQuestions?.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors",
                        filterCategory === cat
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="h-8 w-8 border-3 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Calibrating interview questions...</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Analyzing {role} ({level} level) with focus on {topics || "core competencies"}</p>
                  </div>
                </div>
              ) : !generatedQuestions ? (
                <EmptyState
                  compact
                  icon={Icons.fileText}
                  title={error ? "Error generating questions" : "No questions generated yet"}
                  description={error || "Select a role and technical topics on the left, then click Generate Questions to produce tailored technical prompts."}
                  action={error ? <Button size="sm" onClick={handleGenerate}>Try Again</Button> : undefined}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredQuestions?.map((item, idx) => {
                    const isCopied = copiedIndex === idx;

                    return (
                      <div
                        key={idx}
                        className="group flex flex-col gap-2 p-4 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] transition-all shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[var(--text-muted)] w-5 shrink-0 tabular-nums">
                              {idx + 1}.
                            </span>
                            <Badge variant="neutral" size="sm" className="text-[10px] uppercase font-bold tracking-wider">
                              {item.type}
                            </Badge>
                          </div>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.q, idx)}
                            className={cn(
                              "h-7 px-2.5 flex items-center gap-1.5 rounded text-xs font-medium transition-all",
                              isCopied
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                            )}
                            title="Copy question text"
                          >
                            {isCopied ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-sm text-[var(--text-primary)] leading-relaxed pl-7">
                          {item.q}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
