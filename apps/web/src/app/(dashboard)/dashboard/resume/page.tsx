"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreBar } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

interface ResumeResult {
  score: number;
  scoreExplanation: string;
  atsScore: number;
  breakdown: {
    impact: number;
    formatting: number;
    keywords: number;
    clarity: number;
    brevity: number;
  };
  recruiterPerspective: {
    firstImpression: string;
    hiringRisks: string;
  };
  top3Fixes: {
    title: string;
    severity: "Critical" | "High" | "Medium";
    description: string;
    section: string;
  }[];
  strengths: {
    point: string;
    evidence: string;
  }[];
  weaknesses: {
    issue: string;
    severity: "High" | "Medium" | "Low";
    fix: string;
  }[];
  rewrites: {
    original: string;
    improved: string;
    whyItWorks: string;
  }[];
  missingKeywords: {
    keyword: string;
    reason: string;
    whereToAdd: string;
  }[];
}

const loadingSteps = [
  "Extracting text and structure...",
  "Running NLP entity extraction...",
  "Analyzing metrics and impact...",
  "Evaluating ATS compatibility...",
  "Generating insights...",
];

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setStepIndex((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 1500);
    } else {
      setStepIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const uploadRes = await api.post("/ai/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const jobId = uploadRes.data.jobId;

      const poll = async () => {
        const res = await api.get(`/ai/resume/status/${jobId}`);
        if (res.data.status === "completed") {
          setResult(res.data.data);
          setLoading(false);
        } else if (res.data.status === "failed") {
          setError(res.data.error || "Analysis failed.");
          setLoading(false);
          toast.error("Resume analysis failed");
        } else {
          setTimeout(poll, 2000);
        }
      };

      poll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setError("Failed to analyze resume.");
      setLoading(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }


  const getSeverityVariant = (severity: string): any => {
    switch(severity) {
      case "Critical": return "danger";
      case "High":     return "danger";
      case "Medium":   return "warning";
      case "Low":      return "info";
      default:         return "neutral";
    }
  };

  return (
    <div className="flex flex-col gap-6 page-enter pb-12 max-w-[1200px] mx-auto w-full">
      
      {/* Header */}
      <div className="pb-5 border-b border-[var(--border-default)]">
        <PageHeader
          title="Resume Intelligence"
          description="AI-powered resume analysis. Upload a PDF to extract insights, score skills, and get actionable improvements."
          backHref="/dashboard"
          backLabel="Back to Dashboard"
          actions={
            result ? (
              <Button variant="outline" size="sm" onClick={() => { setResult(null); setFile(null); }}>
                Upload New Resume
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* Upload Zone */}
      {!result && !loading && (
        <div className="animate-in zoom-in-95 duration-500 max-w-3xl mx-auto w-full mt-12">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-[var(--radius-default)] transition-all duration-300 text-center cursor-pointer shadow-none relative overflow-hidden group",
              isDragging ? "border-[var(--accent)] bg-[var(--accent)]/5 scale-[1.02]" : "border-[var(--border-default)] hover:border-[var(--accent)] bg-[var(--bg-surface)] hover:bg-[var(--accent)]/5",
              file ? "border-solid border-[var(--accent)] bg-[var(--accent-muted)]" : ""
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
            
            <div className={cn(
              "h-20 w-20 rounded-[var(--radius-default)] flex items-center justify-center mb-6 transition-all duration-300 shadow-none", 
              file ? "bg-[var(--accent-muted)] text-[var(--accent)] scale-110" : 
              isDragging ? "bg-[var(--accent)] text-white scale-110 shadow-md" : 
              "bg-[var(--bg-elevated)] text-[var(--text-secondary)] group-hover:bg-[var(--accent)] group-hover:text-white"
            )}>
              {file ? Icons.check : Icons.fileText}
            </div>
            
            {file ? (
              <div className="animate-in slide-in-from-bottom-2">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{file.name}</h3>
                <p className="text-sm font-medium text-[var(--text-muted)] mb-8">{formatFileSize(file.size)}</p>
                <div className="flex justify-center gap-4">
                  <Button variant="secondary" className="px-6 border-[var(--border-default)]" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</Button>
                  <Button onClick={(e) => { e.stopPropagation(); handleAnalyze(); }} className="min-w-[180px] px-8 text-[15px]">
                    Analyze Now →
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Drag & drop your resume here</h3>
                <p className="text-[15px] font-medium text-[var(--text-muted)]">or click to browse (PDF only, max 5MB)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-[var(--radius-default)] bg-[var(--danger-bg)]/20 text-[var(--danger-text)] border border-[var(--danger-border)] text-[15px] font-medium flex items-center gap-3 animate-in fade-in max-w-3xl mx-auto w-full mt-4">
          <span className="bg-[var(--danger-text)] text-white rounded-full p-1">{Icons.alert}</span>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !result && (
        <Card className="p-16 flex flex-col items-center justify-center text-center gap-8 shadow-none border border-[var(--border-default)] bg-[var(--bg-surface)]/80 backdrop-blur-xl animate-in zoom-in-95 duration-500 rounded-[var(--radius-default)] max-w-3xl mx-auto w-full mt-12">
          <div className="relative flex items-center justify-center">
            <div className="h-24 w-24 border-[3px] border-[var(--border-default)] rounded-full" />
            <div className="absolute h-24 w-24 border-[3px] border-transparent border-t-[var(--accent)] border-r-[var(--accent)] rounded-full animate-spin" />
            <div className="absolute text-[var(--accent)]">{Icons.activity}</div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 animate-pulse">{loadingSteps[stepIndex]}</h3>
            <div className="flex justify-center gap-2 mt-5">
               {loadingSteps.map((_, i) => (
                 <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i <= stepIndex ? "w-8 bg-[var(--accent)]" : "w-2 bg-[var(--border-strong)]")} />
               ))}
            </div>
          </div>
        </Card>
      )}

      {/* Results UI */}
      {result && (
        <div className="flex flex-col gap-8 w-full animate-in zoom-in-[0.98] duration-700">
          
          {/* Top Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Score + ATS */}
            <Card padding="default" className="flex flex-col">
              <CardHeader>
                <CardTitle>Resume Score</CardTitle>
                <CardDescription>AI-assisted estimate, not a hiring decision</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[56px] font-black text-[var(--text-primary)] leading-none tracking-tight">{result.score}</span>
                    <span className="text-base text-[var(--text-muted)] font-medium">/ 100</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--border-default)] pl-3 italic">
                    {result.scoreExplanation}
                  </p>
                  <div className="pt-3 border-t border-[var(--border-divider)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">ATS Match</span>
                      <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{result.atsScore}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div className="h-full bg-[var(--success)] rounded-full transition-all duration-700" style={{ width: `${result.atsScore}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recruiter Perspective */}
            <Card padding="default" className="lg:col-span-2 flex flex-col">
              <CardHeader>
                <CardTitle>Recruiter Perspective</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">First Impression</h4>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed p-3 rounded-[var(--radius-default)] bg-[var(--bg-elevated)] border border-[var(--border-divider)]">
                      {result.recruiterPerspective.firstImpression}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--danger-text)]">Hiring Risks</h4>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed p-3 rounded-[var(--radius-default)] bg-[var(--danger-bg)] border border-[var(--danger-border)]">
                      {result.recruiterPerspective.hiringRisks}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Metrics Breakdown â€” horizontal bars (RadarChart BANNED per spec) */}
            <Card padding="default" className="col-span-1 flex flex-col">
              <CardHeader><CardTitle>Metrics Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {result.breakdown && Object.entries(result.breakdown).map(([key, val]) => (
                    <ScoreBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} score={val as number} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card padding="default" className="col-span-1 lg:col-span-2 flex flex-col">
              <CardHeader><CardTitle>Top Critical Fixes</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {result.top3Fixes.map((fix, idx) => (
                    <div key={idx} className="flex gap-3.5 p-4 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--border-default)] transition-colors">
                      <div className="h-5 w-5 rounded-full bg-[var(--border-strong)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] shrink-0 mt-0.5">{idx + 1}</div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{fix.title}</h4>
                          <Badge variant="neutral" size="sm">{fix.section}</Badge>
                          <Badge variant={getSeverityVariant(fix.severity)} size="sm">{fix.severity}</Badge>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{fix.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-8 border border-[var(--border-default)] shadow-none rounded-[var(--radius-default)] bg-[var(--bg-surface)]">
              <h3 className="text-[13px] font-bold text-[var(--accent)] uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="bg-[var(--accent-muted)] text-[var(--accent)] p-1 rounded-full">{Icons.check}</span> Proven Strengths
              </h3>
              <div className="flex flex-col gap-4">
                {result.strengths.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2 p-4 rounded-[var(--radius-default)] border border-[var(--border-divider)] bg-[var(--bg-elevated)]">
                    <h4 className="font-bold text-[14px] text-[var(--text-primary)] flex items-start gap-2">
                       <span className="text-[var(--accent)] mt-0.5">{Icons.checkCircle}</span>
                       {s.point}
                    </h4>
                    <div className="pl-6 border-l-2 border-[var(--border-default)] ml-2 mt-1">
                      <p className="text-[13px] text-[var(--text-muted)] italic">"{s.evidence}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 border border-[var(--border-default)] shadow-none rounded-[var(--radius-default)] bg-[var(--bg-surface)]">
              <h3 className="text-[13px] font-bold text-[var(--danger-text)] uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="bg-[var(--danger-bg)]/20 p-1 rounded-full">{Icons.alert}</span> Areas to Improve
              </h3>
              <div className="flex flex-col gap-4">
                {result.weaknesses.map((w, i) => (
                  <div key={i} className="flex flex-col gap-2 p-4 rounded-[var(--radius-default)] border border-[var(--border-divider)] bg-[var(--bg-elevated)]">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-[14px] text-[var(--text-primary)] flex items-start gap-2">
                         <span className="text-[var(--danger-text)] mt-0.5">{Icons.x}</span>
                         {w.issue}
                      </h4>
                      <Badge variant={getSeverityVariant(w.severity)} size="sm">
                         {w.severity}
                      </Badge>
                    </div>
                    <div className="pl-6 ml-2 mt-1">
                      <p className="text-[13.5px] text-[var(--text-secondary)] font-medium">Fix: {w.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Bullet Rewrites */}
          {result.rewrites.length > 0 && (
            <Card className="p-8 border border-[var(--border-default)] shadow-none rounded-[var(--radius-default)] bg-[var(--bg-surface)]">
              <h3 className="text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6 flex items-center gap-2">
                {Icons.code} Bullet Point Rewrites
              </h3>
              
              <div className="flex flex-col gap-6">
                {result.rewrites.map((rewrite, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg-elevated)] p-4 rounded-[var(--radius-default)] border border-[var(--border-divider)]">
                    <div className="flex flex-col gap-2 p-4 rounded-[var(--radius-default)] bg-[var(--danger-bg)]/5 border border-[var(--danger-border)]/30">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--danger-text)]">Original (Weak)</span>
                      <p className="text-[14px] text-[var(--text-secondary)] italic leading-relaxed line-through decoration-[var(--danger-text)]/40">
                        {rewrite.original}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 p-4 rounded-[var(--radius-default)] bg-[var(--accent-muted)] border border-[var(--accent)]">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)]">Improved (XYZ Format)</span>
                      <p className="text-[14px] text-[var(--text-primary)] font-medium leading-relaxed">
                        {rewrite.improved}
                      </p>
                      <div className="mt-3 pt-3 border-t border-[var(--accent)]/20">
                        <p className="text-[12px] text-[var(--accent)] font-semibold flex items-start gap-1.5">
                           <span className="mt-0.5">{Icons.activity}</span> {rewrite.whyItWorks}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Missing Keywords */}
          {result.missingKeywords.length > 0 && (
             <Card className="p-8 border border-[var(--border-default)] shadow-none rounded-[var(--radius-default)] bg-[var(--bg-surface)]">
               <h3 className="text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6 flex items-center gap-2">
                 {Icons.checkCircle} Contextual Keyword Recommendations
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                 {result.missingKeywords.map((kw, i) => (
                   <div key={i} className="flex flex-col gap-3 p-5 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-elevated)] relative overflow-hidden group hover:border-[var(--accent)] transition-colors">
                     <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--accent)]/5 rounded-bl-full -z-0" />
                     <h4 className="font-bold text-[16px] text-[var(--text-primary)] z-10 flex justify-between items-center">
                       {kw.keyword}
                       <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] border-[var(--border-default)]">
                         {kw.whereToAdd}
                       </Badge>
                     </h4>
                     <p className="text-[13px] text-[var(--text-secondary)] font-medium z-10 leading-relaxed">
                       {kw.reason}
                     </p>
                   </div>
                 ))}
               </div>
             </Card>
          )}

        </div>
      )}

    </div>
  );
}

