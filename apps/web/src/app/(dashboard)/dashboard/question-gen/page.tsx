"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto w-full pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Question Generator</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Generate AI-powered interview questions tailored to specific roles, experience levels, and technology stacks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Configuration Form */}
        <Card className="lg:col-span-4 p-6 bg-[var(--bg-surface)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            Configuration
          </h3>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">Role / Title <span className="text-[var(--danger)]">*</span></label>
              <input 
                type="text" 
                placeholder="e.g. Frontend Engineer" 
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-disabled)]"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">Experience Level</label>
              <select 
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
              >
                <option value="junior">Junior / Entry-Level</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">Key Topics / Technologies</label>
              <textarea 
                placeholder="e.g. React, Next.js, System Design, Communication" 
                rows={3}
                value={topics}
                onChange={e => setTopics(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-disabled)] resize-none"
              />
            </div>

            <Button 
              className="w-full justify-center mt-2" 
              onClick={handleGenerate} 
              disabled={!role || loading}
              loading={loading}
            >
              {loading ? "Generating..." : "Generate Questions"}
            </Button>
          </div>
        </Card>

        {/* Right Panel: Output */}
        <Card className="lg:col-span-8 p-6 bg-[var(--bg-surface)] min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-default)]">
             <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              Generated Questions
            </h3>
            {generatedQuestions && (
              <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => toast.info("Export to CSV coming soon!")}>
                Export to CSV
              </Button>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
                <div className="h-8 w-8 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin mb-4" />
                <p className="text-sm">Curating the best questions for {role}...</p>
              </div>
            ) : !generatedQuestions ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                {error ? (
                  <>
                    <div className="h-16 w-16 bg-[var(--danger-bg)] rounded-2xl flex items-center justify-center text-[var(--danger-text)] text-3xl shadow-sm border border-[var(--border-default)] mb-4">
                      <span>!</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--error-text)] mb-1">Error Generating Questions</h4>
                    <p className="text-xs text-[var(--text-muted)] max-w-[250px]">{error}</p>
                    <Button variant="secondary" size="sm" className="mt-4" onClick={handleGenerate}>Try Again</Button>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 bg-[var(--bg-elevated)] rounded-2xl flex items-center justify-center text-[var(--text-disabled)] mb-4">
                      {Icons.fileText}
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No questions generated yet</h4>
                    <p className="text-xs text-[var(--text-muted)] max-w-[250px]">Fill out the configuration on the left to generate tailored interview questions.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-500">
                {generatedQuestions.map((item, idx) => (
                  <div key={idx} className="group p-4 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg hover:border-[var(--accent-muted)] transition-colors">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap",
                        item.type === "Behavioral" ? "bg-[var(--info-bg)]/20 text-[var(--info-text)]" : 
                        item.type === "System Design" ? "bg-[var(--warning-bg)]/20 text-[var(--warning-text)]" : 
                        "bg-[var(--accent-muted)]/20 text-[var(--accent)]"
                      )}>
                        {item.type}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Copy to clipboard" onClick={() => navigator.clipboard.writeText(item.q)}>
                        {Icons.copy}
                      </Button>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                      {item.q}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
