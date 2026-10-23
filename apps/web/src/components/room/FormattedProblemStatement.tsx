"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface FormattedProblemStatementProps {
  rawText: string;
  isCandidate?: boolean;
  onInsertStarter?: (code: string) => void;
}

interface Example {
  index: number;
  input: string;
  output: string;
  explanation?: string;
}

interface ParsedProblem {
  title: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  description: string;
  functionSignature?: string;
  examples: Example[];
  complexity?: string;
  constraints: string[];
  rawFallback: string[];
}

export function parseProblemText(text: string): ParsedProblem {
  if (!text) {
    return {
      title: "Technical Coding Challenge",
      description: "",
      examples: [],
      constraints: [],
      rawFallback: [],
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = "";
  let difficulty: "Easy" | "Medium" | "Hard" | undefined;
  const descriptionParts: string[] = [];
  let functionSignature: string | undefined;
  const examples: Example[] = [];
  let complexity: string | undefined;
  const constraints: string[] = [];
  const rawFallback: string[] = [];

  let currentExample: Partial<Example> | null = null;
  let inConstraints = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Title (e.g. "LeetCode #217: Contains Duplicate" or "1. Two Sum")
    if (i === 0 && (line.toLowerCase().includes("leetcode") || line.toLowerCase().includes("problem") || /^(\d+[\.\:]|[#])/i.test(line))) {
      title = line.replace(/^[#\*\s]+/, "");
      continue;
    }

    // Detect explicit difficulty
    if (/\b(difficulty:\s*(easy|medium|hard))\b/i.test(line)) {
      const match = line.match(/\b(easy|medium|hard)\b/i);
      if (match) {
        difficulty = (match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()) as "Easy" | "Medium" | "Hard";
      }
      continue;
    }

    // Detect function signature: e.g. "Function: function containsDuplicate(nums)" or "def containsDuplicate(nums):"
    if (/^(function:|signature:|prototype:)/i.test(line)) {
      functionSignature = line.replace(/^(function:|signature:|prototype:)\s*/i, "").trim();
      continue;
    } else if (!functionSignature && /^(function\s+\w+\s*\(.*\)|def\s+\w+\s*\(.*\)\s*:?)/.test(line)) {
      functionSignature = line.trim();
      continue;
    }

    // Detect Target Complexity
    if (/^(target complexity:|complexity:|time complexity:|space complexity:)/i.test(line)) {
      complexity = line.replace(/^(target complexity:|complexity:|time complexity:|space complexity:)\s*/i, "").trim();
      continue;
    }

    // Detect Constraints
    if (/^(constraints?:|rules:)/i.test(line)) {
      inConstraints = true;
      continue;
    }

    if (inConstraints) {
      if (line.startsWith("-") || line.startsWith("•") || line.startsWith("*")) {
        constraints.push(line.replace(/^[-•\*]\s*/, ""));
        continue;
      }
    }

    // Detect Example markers
    if (/^example(\s*\d*)?:?/i.test(line)) {
      if (currentExample && currentExample.input && currentExample.output) {
        examples.push({
          index: examples.length + 1,
          input: currentExample.input,
          output: currentExample.output,
          explanation: currentExample.explanation,
        });
        currentExample = null;
      }
      currentExample = { index: examples.length + 1 };
      continue;
    }

    // Detect Input in example
    if (/^input\s*:/i.test(line)) {
      const inputVal = line.replace(/^input\s*:\s*/i, "");
      if (!currentExample) currentExample = { index: examples.length + 1 };
      currentExample.input = inputVal;
      continue;
    }

    // Detect Output in example
    if (/^output\s*:/i.test(line)) {
      const outputVal = line.replace(/^output\s*:\s*/i, "");
      if (!currentExample) currentExample = { index: examples.length + 1 };
      currentExample.output = outputVal;
      continue;
    }

    // Detect Explanation in example
    if (/^explanation\s*:/i.test(line)) {
      const explanationVal = line.replace(/^explanation\s*:\s*/i, "");
      if (currentExample) currentExample.explanation = explanationVal;
      continue;
    }

    // Otherwise, accumulate description or fallback
    if (!currentExample && !inConstraints) {
      descriptionParts.push(line);
    } else {
      rawFallback.push(line);
    }
  }

  // Push pending example
  if (currentExample && currentExample.input && currentExample.output) {
    examples.push({
      index: examples.length + 1,
      input: currentExample.input,
      output: currentExample.output,
      explanation: currentExample.explanation,
    });
  }

  // If no title was found from line 0
  if (!title) {
    if (descriptionParts.length > 0 && descriptionParts[0].length < 60) {
      title = descriptionParts.shift()!;
    } else {
      title = "Algorithmic Challenge";
    }
  }

  // Auto-detect difficulty from title or text if not explicitly tagged
  if (!difficulty) {
    const fullText = text.toLowerCase();
    if (fullText.includes("difficulty: hard") || fullText.includes("(hard)")) {
      difficulty = "Hard";
    } else if (fullText.includes("difficulty: easy") || fullText.includes("(easy)")) {
      difficulty = "Easy";
    } else {
      // Default to Medium if unknown
      difficulty = "Medium";
    }
  }

  return {
    title,
    difficulty,
    description: descriptionParts.join(" "),
    functionSignature,
    examples,
    complexity,
    constraints,
    rawFallback,
  };
}

export function FormattedProblemStatement({
  rawText,
  isCandidate = false,
  onInsertStarter,
}: FormattedProblemStatementProps) {
  const parsed = useMemo(() => parseProblemText(rawText), [rawText]);

  const difficultyColors = {
    Easy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Hard: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  const handleCopySignature = () => {
    if (!parsed.functionSignature) return;
    navigator.clipboard.writeText(parsed.functionSignature);
    toast.success("Function signature copied to clipboard!");
  };

  const handleInsertStarter = () => {
    if (!parsed.functionSignature || !onInsertStarter) return;
    
    // Create clean starter boilerplate (NO COMMENTS, ONLY THE FUNCTION!)
    let starter = "";
    if (parsed.functionSignature.startsWith("def ")) {
      starter = `${parsed.functionSignature}\n    pass\n`;
    } else if (parsed.functionSignature.includes("{")) {
      starter = parsed.functionSignature;
    } else {
      starter = `${parsed.functionSignature} {\n  \n}\n`;
    }
    
    onInsertStarter(starter);
    toast.success("Starter code inserted cleanly into editor!");
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Problem Header: Title & Badges */}
      <div className="pb-3 border-b border-[var(--border-divider)] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              {parsed.title}
            </h3>
          </div>
          {parsed.difficulty && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                difficultyColors[parsed.difficulty]
              }`}
            >
              {parsed.difficulty}
            </span>
          )}
        </div>
      </div>

      {/* Description Section */}
      {parsed.description && (
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Description
          </h4>
          <p className="text-xs text-[var(--text-primary)] leading-relaxed font-normal">
            {parsed.description}
          </p>
        </div>
      )}

      {/* Function Signature Pill */}
      {parsed.functionSignature && (
        <div className="p-3 rounded-[var(--radius-default)] bg-[#141820] border border-[#273244] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
              Function Signature
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopySignature}
                className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors"
                title="Copy signature"
              >
                Copy
              </button>
              {onInsertStarter && (
                <button
                  type="button"
                  onClick={handleInsertStarter}
                  className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold transition-colors"
                  title="Insert clean function into editor (no comments)"
                >
                  ⚡ Insert Starter
                </button>
              )}
            </div>
          </div>
          <pre className="font-mono text-xs text-sky-200 overflow-x-auto whitespace-pre">
            <code>{parsed.functionSignature}</code>
          </pre>
        </div>
      )}

      {/* Examples Section */}
      {parsed.examples.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Examples
          </h4>
          <div className="space-y-2.5">
            {parsed.examples.map((ex, idx) => (
              <div
                key={idx}
                className="p-3 rounded-[var(--radius-default)] bg-[var(--bg-base)] border border-[var(--border-divider)] space-y-2 font-mono"
              >
                <div className="text-[10px] font-bold text-amber-400 tracking-wide">
                  Example {idx + 1}:
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[var(--text-muted)] select-none text-[11px] w-12 shrink-0">
                      Input:
                    </span>
                    <span className="text-emerald-400 font-medium break-all">
                      {ex.input}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[var(--text-muted)] select-none text-[11px] w-12 shrink-0">
                      Output:
                    </span>
                    <span className="text-indigo-400 font-bold break-all">
                      {ex.output}
                    </span>
                  </div>
                  {ex.explanation && (
                    <div className="flex items-baseline gap-2 pt-1 border-t border-[var(--border-divider)] mt-1">
                      <span className="text-[var(--text-muted)] select-none text-[11px] w-12 shrink-0 font-sans">
                        Notes:
                      </span>
                      <span className="text-[var(--text-secondary)] text-[11px] font-sans">
                        {ex.explanation}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constraints & Target Complexity Section */}
      {(parsed.complexity || parsed.constraints.length > 0) && (
        <div className="p-3 rounded-[var(--radius-default)] bg-[var(--bg-base)] border border-[var(--border-divider)] space-y-2">
          {parsed.complexity && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-amber-400 font-bold">⚡ Target Complexity:</span>
              <span className="font-mono text-emerald-400 font-medium">
                {parsed.complexity}
              </span>
            </div>
          )}
          {parsed.constraints.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Constraints:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-[var(--text-secondary)] font-mono">
                {parsed.constraints.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Fallback lines if non-standard format */}
      {parsed.examples.length === 0 && parsed.rawFallback.length > 0 && (
        <div className="p-3 rounded-[var(--radius-default)] bg-[var(--bg-base)] border border-[var(--border-divider)] space-y-1 text-xs text-[var(--text-secondary)] leading-relaxed font-mono whitespace-pre-wrap">
          {parsed.rawFallback.join("\n")}
        </div>
      )}
    </div>
  );
}
