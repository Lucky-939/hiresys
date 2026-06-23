"use client";

import { useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";

interface ResumeResult {
  score: number;
  atsScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingKeywords: string[];
}

function FeedbackCard({ title, items, icon, colorClass, bgClass }: { title: string; items: string[]; icon: React.ReactNode; colorClass: string; bgClass: string; }) {
  if (!items?.length) return null;
  return (
    <Card className={cn("p-6", bgClass, "border border-white/20 dark:border-black/10 shadow-sm")}>
      <h4 className={cn("text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2", colorClass)}>
        <span className={cn("text-white rounded-full p-0.5", colorClass.replace("text-", "bg-"))}>{icon}</span> {title}
      </h4>
      <div className="space-y-3">
        {items.map((s, i) => (
          <div key={i} className="flex items-start gap-3 bg-white/40 dark:bg-black/10 p-3 rounded-lg">
            <span className={cn("mt-0.5 shrink-0", colorClass)}>{icon}</span>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">{s}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    setStatusMessage("Uploading resume…");

    try {
      // Simulate API call for demo since this is mostly a UI exercise
      setTimeout(() => setStatusMessage("Extracting text and structure…"), 1500);
      setTimeout(() => setStatusMessage("Analyzing with AI…"), 3000);
      setTimeout(() => {
        setResult({
          score: 85,
          atsScore: 92,
          summary: "This resume shows strong experience in full-stack development, particularly with modern JavaScript frameworks. The candidate has good impact metrics but lacks specific keywords related to cloud deployment (AWS/GCP).",
          strengths: ["Quantified impact in bullet points", "Clear progression of roles", "Strong technical stack alignment"],
          weaknesses: ["Missing cloud infrastructure keywords", "Education section is too long"],
          suggestions: ["Add specific AWS services used (e.g., S3, EC2)", "Shorten education to just degree and university"],
          missingKeywords: ["AWS", "Docker", "Kubernetes", "CI/CD"]
        });
        setLoading(false);
        setStatusMessage("");
      }, 5000);

    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setError("Failed to analyze resume.");
      setLoading(false);
      setStatusMessage("");
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  const radarData = result ? [
    { subject: "Formatting", A: 95, fullMark: 100 },
    { subject: "Impact", A: 85, fullMark: 100 },
    { subject: "Keywords", A: 75, fullMark: 100 },
    { subject: "Clarity", A: 90, fullMark: 100 },
    { subject: "Brevity", A: 80, fullMark: 100 },
  ] : [];

  const barData = result ? [
    { name: "Overall", score: result.score, fill: "var(--accent)" },
    { name: "ATS", score: result.atsScore, fill: "var(--success)" }
  ] : [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-5xl mx-auto w-full">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Resume Analyzer</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Upload a PDF resume to get instant AI-powered scoring, parsing feedback, and improvement suggestions.</p>
      </div>

      {/* Upload Zone */}
      {!result && (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl transition-all duration-200 text-center cursor-pointer bg-[var(--bg-surface)]",
            isDragging ? "border-[var(--accent)] bg-[var(--accent-muted)]/50" : "border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)]",
            file ? "border-solid border-[var(--success-border)] bg-[var(--success-bg)]/10" : ""
          )}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          
          <div className={cn("h-16 w-16 rounded-full flex items-center justify-center mb-4 transition-colors", file ? "bg-[var(--success-bg)] text-[var(--success-text)]" : isDragging ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-disabled)]")}>
            {file ? Icons.check : Icons.upload}
          </div>
          
          {file ? (
            <>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{file.name}</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">{formatFileSize(file.size)}</p>
              <div className="flex gap-4">
                <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</Button>
                <Button onClick={(e) => { e.stopPropagation(); handleAnalyze(); }} loading={loading} className="min-w-[140px] justify-center">
                  {loading ? statusMessage : "Analyze Resume"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Drag & drop your resume here</h3>
              <p className="text-sm text-[var(--text-muted)]">or click to browse (PDF only, max 5MB)</p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-border)] text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !result && (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-6 animate-pulse">
          <div className="h-16 w-16 border-4 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{statusMessage}</h3>
            <p className="text-sm text-[var(--text-muted)] mt-2">This usually takes about 5-10 seconds.</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-6 animate-in zoom-in-95 duration-500">
          
          {/* Top Level Summary & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 flex flex-col">
              <h3 className="text-xs font-bold text-[var(--text-disabled)] uppercase tracking-widest mb-4 flex items-center gap-2">
                AI Summary
              </h3>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-6 flex-1">
                {result.summary}
              </p>
              
              {result.missingKeywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-3">Missing Keywords to Consider:</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map(kw => (
                      <Badge key={kw} variant="warning" className="bg-[var(--warning-bg)]/20 border-none font-mono text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6 flex flex-col items-center justify-center">
              <h3 className="text-xs font-bold text-[var(--text-disabled)] uppercase tracking-widest mb-2 self-start w-full">Scores</h3>
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} width={60} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24} background={{ fill: 'var(--bg-elevated)' }}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4 flex flex-col items-center justify-center col-span-1 md:col-span-3 lg:col-span-1 min-h-[300px]">
               <h3 className="text-xs font-bold text-[var(--text-disabled)] uppercase tracking-widest self-start w-full px-2">Analysis Breakdown</h3>
               <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="var(--border-default)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Candidate" dataKey="A" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            <div className="col-span-1 md:col-span-3 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeedbackCard
                title="Strengths"
                items={result.strengths}
                icon={Icons.check}
                colorClass="text-[var(--success-text)]"
                bgClass="bg-[var(--success-bg)]/10"
              />
              <FeedbackCard
                title="Improvements"
                items={result.suggestions}
                icon={Icons.alert}
                colorClass="text-[var(--warning-text)]"
                bgClass="bg-[var(--warning-bg)]/10"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => { setResult(null); setFile(null); }}>Analyze Another Resume</Button>
          </div>
        </div>
      )}

    </div>
  );
}
