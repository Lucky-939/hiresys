"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TestCase } from "@/lib/test-runner";

interface FormattedProblemStatementProps {
  rawText: string;
  isCandidate?: boolean;
  onInsertStarter?: (code: string) => void;
  testCases?: TestCase[];
  onTestCasesChange?: (cases: TestCase[]) => void;
}

interface ParsedProblem {
  title: string;
  description: string;
  functionSignature?: string;
  examples: TestCase[];
  complexity?: string;
  constraints: string[];
  rawFallback: string[];
}

export function cleanProblemTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^[#\*\s]+/, "")
    .replace(/\bLeetCode\s*(#?\d+[\:\.\-]?\s*)?:?\s*/gi, "")
    .replace(/\b(Problem|Question|Q)\s*(#?\d+[\:\.\-]?\s*)?:?\s*/gi, "")
    .replace(/^\s*#?\d+[\.\:\-\)]\s*/, "")
    .trim();
}



export function ensureFourTestCases(
  existingCases: TestCase[],
  functionSignature?: string,
  text?: string
): TestCase[] {
  const sig = (functionSignature || "").toLowerCase();
  const desc = (text || "").toLowerCase();

  // Known templates with guaranteed 4 test cases (2 public, 2 hidden edge cases)
  const templates: Record<string, TestCase[]> = {
    parentheses: [
      { index: 1, input: 's = "()[]{}"', output: "true", isHidden: false },
      { index: 2, input: 's = "(]"', output: "false", isHidden: false },
      { index: 3, input: 's = "([)]"', output: "false", isHidden: true },
      { index: 4, input: 's = "{[]}"', output: "true", isHidden: true },
    ],
    twosum: [
      { index: 1, input: "nums = [2, 7, 11, 15], target = 9", output: "[0, 1]", isHidden: false },
      { index: 2, input: "nums = [3, 2, 4], target = 6", output: "[1, 2]", isHidden: false },
      { index: 3, input: "nums = [3, 3], target = 6", output: "[0, 1]", isHidden: true },
      { index: 4, input: "nums = [-1, -2, -3, -4, -5], target = -8", output: "[2, 4]", isHidden: true },
    ],
    stock: [
      { index: 1, input: "prices = [7, 1, 5, 3, 6, 4]", output: "5", isHidden: false },
      { index: 2, input: "prices = [7, 6, 4, 3, 1]", output: "0", isHidden: false },
      { index: 3, input: "prices = [2, 4, 1]", output: "2", isHidden: true },
      { index: 4, input: "prices = [1, 2, 3, 4, 5]", output: "4", isHidden: true },
    ],
    palindrome: [
      { index: 1, input: 's = "A man, a plan, a canal: Panama"', output: "true", isHidden: false },
      { index: 2, input: 's = "race a car"', output: "false", isHidden: false },
      { index: 3, input: 's = " "', output: "true", isHidden: true },
      { index: 4, input: 's = "0P"', output: "false", isHidden: true },
    ],
    duplicate: [
      { index: 1, input: "nums = [1, 2, 3, 1]", output: "true", isHidden: false },
      { index: 2, input: "nums = [1, 2, 3, 4]", output: "false", isHidden: false },
      { index: 3, input: "nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]", output: "true", isHidden: true },
      { index: 4, input: "nums = [99]", output: "false", isHidden: true },
    ],
    anagram: [
      { index: 1, input: 'strs = ["eat", "tea", "tan", "ate", "nat", "bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]', isHidden: false },
      { index: 2, input: 'strs = [""]', output: '[[""]]', isHidden: false },
      { index: 3, input: 'strs = ["a"]', output: '[["a"]]', isHidden: true },
      { index: 4, input: 'strs = ["ab", "ba"]', output: '[["ab","ba"]]', isHidden: true },
    ],
    substring: [
      { index: 1, input: 's = "abcabcbb"', output: "3", isHidden: false },
      { index: 2, input: 's = "bbbbb"', output: "1", isHidden: false },
      { index: 3, input: 's = "pwwkew"', output: "3", isHidden: true },
      { index: 4, input: 's = ""', output: "0", isHidden: true },
    ],
    intervals: [
      { index: 1, input: "intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]", output: "[[1, 6], [8, 10], [15, 18]]", isHidden: false },
      { index: 2, input: "intervals = [[1, 4], [4, 5]]", output: "[[1, 5]]", isHidden: false },
      { index: 3, input: "intervals = [[1, 4], [2, 3]]", output: "[[1, 4]]", isHidden: true },
      { index: 4, input: "intervals = [[1, 4]]", output: "[[1, 4]]", isHidden: true },
    ],
    product: [
      { index: 1, input: "nums = [1, 2, 3, 4]", output: "[24, 12, 8, 6]", isHidden: false },
      { index: 2, input: "nums = [-1, 1, 0, -3, 3]", output: "[0, 0, 9, 0, 0]", isHidden: false },
      { index: 3, input: "nums = [0, 0]", output: "[0, 0]", isHidden: true },
      { index: 4, input: "nums = [2, 3]", output: "[3, 2]", isHidden: true },
    ],
    topk: [
      { index: 1, input: "nums = [1, 1, 1, 2, 2, 3], k = 2", output: "[1, 2]", isHidden: false },
      { index: 2, input: "nums = [1], k = 1", output: "[1]", isHidden: false },
      { index: 3, input: "nums = [4, 1, -1, 2, -1, 2, 3], k = 2", output: "[-1, 2]", isHidden: true },
      { index: 4, input: "nums = [3, 0, 1, 0], k = 1", output: "[0]", isHidden: true },
    ],
    trap: [
      { index: 1, input: "height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]", output: "6", isHidden: false },
      { index: 2, input: "height = [4, 2, 0, 3, 2, 5]", output: "9", isHidden: false },
      { index: 3, input: "height = [3, 0, 2, 0, 4]", output: "7", isHidden: true },
      { index: 4, input: "height = [1, 2, 3, 4, 5]", output: "0", isHidden: true },
    ],
  };

  // Find matching template
  let matchedTemplate: TestCase[] | null = null;
  if (sig.includes("isvalid") || desc.includes("parentheses")) matchedTemplate = templates.parentheses;
  else if (sig.includes("twosum") || desc.includes("two sum") || desc.includes("target")) matchedTemplate = templates.twosum;
  else if (sig.includes("maxprofit") || desc.includes("stock") || desc.includes("buy and sell")) matchedTemplate = templates.stock;
  else if (sig.includes("ispalindrome") || desc.includes("palindrome")) matchedTemplate = templates.palindrome;
  else if (sig.includes("containsduplicate") || desc.includes("duplicate")) matchedTemplate = templates.duplicate;
  else if (sig.includes("groupanagrams") || desc.includes("anagram")) matchedTemplate = templates.anagram;
  else if (sig.includes("lengthoflongest") || desc.includes("without repeating")) matchedTemplate = templates.substring;
  else if (sig.includes("merge") || desc.includes("intervals")) matchedTemplate = templates.intervals;
  else if (sig.includes("productexceptself") || desc.includes("product of array")) matchedTemplate = templates.product;
  else if (sig.includes("topkfrequent") || desc.includes("top k")) matchedTemplate = templates.topk;
  else if (sig.includes("trap") || desc.includes("water") || desc.includes("trapping")) matchedTemplate = templates.trap;

  if (existingCases.length === 0) {
    if (matchedTemplate) return matchedTemplate;
    // Generic fallback 4 cases
    return [
      { index: 1, input: 'input = "sample_test_1"', output: "true", isHidden: false },
      { index: 2, input: 'input = "sample_test_2"', output: "false", isHidden: false },
      { index: 3, input: 'input = "sample_edge_case_3"', output: "true", isHidden: true },
      { index: 4, input: 'input = "sample_extreme_case_4"', output: "false", isHidden: true },
    ];
  }

  // If we already parsed cases, ensure compulsory 4:
  const result: TestCase[] = existingCases.slice(0, 4).map((tc, idx) => ({
    ...tc,
    index: idx + 1,
    isHidden: idx >= 2,
  }));

  // If fewer than 4 cases were in the question text, fill from matched template or synthesize
  while (result.length < 4) {
    const nextIdx = result.length + 1;
    if (matchedTemplate && matchedTemplate[nextIdx - 1]) {
      result.push({ ...matchedTemplate[nextIdx - 1], index: nextIdx, isHidden: nextIdx >= 3 });
    } else {
      const baseCase = result[0];
      result.push({
        index: nextIdx,
        input: `${baseCase.input} (edge_variant_${nextIdx})`,
        output: baseCase.output,
        isHidden: true,
      });
    }
  }

  return result;
}

export function parseProblemText(text: string): ParsedProblem {
  if (!text) {
    return {
      title: "",
      description: "",
      examples: ensureFourTestCases([]),
      constraints: [],
      rawFallback: [],
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = "";
  const descriptionParts: string[] = [];
  let functionSignature: string | undefined;
  const rawExamples: TestCase[] = [];
  let complexity: string | undefined;
  const constraints: string[] = [];
  const rawFallback: string[] = [];

  let currentExample: Partial<TestCase> | null = null;
  let inConstraints = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Title
    if (i === 0 && (line.toLowerCase().includes("leetcode") || line.toLowerCase().includes("problem") || /^(\d+[\.\:]|[#])/i.test(line))) {
      title = cleanProblemTitle(line);
      continue;
    }

    // Skip explicit difficulty lines
    if (/\b(difficulty:\s*(easy|medium|hard))\b/i.test(line)) {
      continue;
    }

    // Detect function signature
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

    // 1. Same-line Input & Output (e.g. Input: s = "()[]{}" -> Output: true)
    if (/^input\s*:/i.test(line) && /output\s*:/i.test(line)) {
      if (currentExample && currentExample.input && currentExample.output) {
        rawExamples.push({
          index: rawExamples.length + 1,
          input: currentExample.input,
          output: currentExample.output,
          explanation: currentExample.explanation,
        });
        currentExample = null;
      }
      const parts = line.split(/(?:->|=>|,\s*output\s*:|\s+output\s*:)/i);
      const inVal = parts[0].replace(/^input\s*:\s*/i, "").trim();
      const outVal = (parts[1] || "").replace(/^output\s*:\s*/i, "").replace(/[\(\[\{]?notes?.*$/i, "").trim();
      rawExamples.push({
        index: rawExamples.length + 1,
        input: inVal,
        output: outVal,
      });
      continue;
    }

    // 2. Detect Example markers
    if (/^example(\s*\d*)?:?/i.test(line)) {
      if (currentExample && currentExample.input && currentExample.output) {
        rawExamples.push({
          index: rawExamples.length + 1,
          input: currentExample.input,
          output: currentExample.output,
          explanation: currentExample.explanation,
        });
        currentExample = null;
      }
      currentExample = { index: rawExamples.length + 1 };
      continue;
    }

    // 3. Detect Input in example
    if (/^input\s*:/i.test(line)) {
      if (currentExample && currentExample.input && currentExample.output) {
        rawExamples.push({
          index: rawExamples.length + 1,
          input: currentExample.input,
          output: currentExample.output,
          explanation: currentExample.explanation,
        });
        currentExample = null;
      }
      currentExample = {
        index: rawExamples.length + 1,
        input: line.replace(/^input\s*:\s*/i, "").trim(),
      };
      continue;
    }

    // 4. Detect Output in example
    if (/^output\s*:/i.test(line) && currentExample) {
      currentExample.output = line.replace(/^output\s*:\s*/i, "").trim();
      continue;
    }

    // 5. Detect Explanation
    if (/^explanation\s*:/i.test(line) && currentExample) {
      currentExample.explanation = line.replace(/^explanation\s*:\s*/i, "").trim();
      rawExamples.push({
        index: rawExamples.length + 1,
        input: currentExample.input || "",
        output: currentExample.output || "",
        explanation: currentExample.explanation,
      });
      currentExample = null;
      continue;
    }

    // Description accumulation
    if (!currentExample && !inConstraints) {
      descriptionParts.push(line);
    } else {
      rawFallback.push(line);
    }
  }

  // Push pending example
  if (currentExample && currentExample.input && currentExample.output) {
    rawExamples.push({
      index: rawExamples.length + 1,
      input: currentExample.input,
      output: currentExample.output,
      explanation: currentExample.explanation,
    });
  }

  // Ensure title is extracted
  if (!title) {
    if (descriptionParts.length > 0 && descriptionParts[0].length < 60) {
      title = cleanProblemTitle(descriptionParts.shift()!);
    } else {
      title = "";
    }
  }

  const cleanDescription = descriptionParts
    .join(" ")
    .replace(/\bLeetCode\s*(#?\d+[\:\.\-]?\s*)?:?\s*/gi, "")
    .replace(/\b(difficulty:\s*(easy|medium|hard))\b/gi, "")
    .trim();

  // Enforce compulsory 4 test cases (2 visible, 2 hidden)
  const examples = ensureFourTestCases(rawExamples, functionSignature, text);

  return {
    title,
    description: cleanDescription,
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
  testCases: externalTestCases,
  onTestCasesChange,
}: FormattedProblemStatementProps) {
  const parsed = useMemo(() => parseProblemText(rawText), [rawText]);

  // Manage test cases state - fixed 4 test cases per question
  const [localTestCases, setLocalTestCases] = useState<TestCase[]>([]);

  useEffect(() => {
    if (externalTestCases && externalTestCases.length > 0) {
      setLocalTestCases(externalTestCases);
    } else if (parsed.examples.length > 0) {
      setLocalTestCases(parsed.examples);
      onTestCasesChange?.(parsed.examples);
    }
  }, [externalTestCases, parsed.examples]);

  const activeCases = (externalTestCases && externalTestCases.length > 0) ? externalTestCases : localTestCases;

  const handleCopySignature = () => {
    if (!parsed.functionSignature) return;
    navigator.clipboard.writeText(parsed.functionSignature);
    toast.success("Function signature copied to clipboard!");
  };

  const handleInsertStarter = () => {
    if (!parsed.functionSignature || !onInsertStarter) return;
    
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
      {/* Problem Description (No LeetCode Title or Topic Header) */}
      {parsed.description && (
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <span>📋</span> Problem Description
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
            {isCandidate && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySignature}
                  className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                  title="Copy signature"
                >
                  Copy
                </button>
                {onInsertStarter && (
                  <button
                    type="button"
                    onClick={handleInsertStarter}
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    title="Insert clean function into editor (no comments)"
                  >
                    ⚡ Insert Starter
                  </button>
                )}
              </div>
            )}
          </div>
          <pre className="font-mono text-xs text-sky-200 overflow-x-auto whitespace-pre">
            <code>{parsed.functionSignature}</code>
          </pre>
        </div>
      )}

      {/* Compulsory 4 Test Cases Section (2 Visible, 2 Hidden to Candidate; All 4 to Recruiter) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <span>🧪</span> Test Cases ({activeCases.length})
          </h4>
          <span className="text-[10px] font-mono">
            {isCandidate ? (
              <span className="text-emerald-400/90 font-medium">2 Public • 2 Hidden</span>
            ) : (
              <span className="text-purple-300 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                4/4 Recruiter Full View
              </span>
            )}
          </span>
        </div>

        {/* List of Test Cases */}
        <div className="space-y-2">
          {activeCases.map((tc, idx) => {
            const isHiddenFromCandidate = isCandidate && (tc.isHidden ?? idx >= 2);

            if (isHiddenFromCandidate) {
              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-[var(--radius-default)] bg-[#141820]/60 border border-dashed border-[#273244] space-y-1 select-none transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      🔒 Test Case {idx + 1}
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-sans font-semibold">
                      Hidden Test Case
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] italic font-sans flex items-center gap-1.5 py-0.5">
                    <span>🔒</span> Evaluated automatically upon &apos;Run Code&apos; to test edge cases.
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className="p-2.5 rounded-[var(--radius-default)] bg-[var(--bg-base)] border border-[var(--border-divider)] space-y-1.5 font-mono group hover:border-indigo-500/30 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Test Case {idx + 1}
                  </span>
                  {!isCandidate && (
                    <span
                      className={cn(
                        "text-[9px] uppercase px-1.5 py-0.2 rounded font-sans font-semibold border flex items-center gap-1",
                        idx >= 2
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}
                    >
                      {idx >= 2 ? "🔒 Hidden to Candidate" : "Public"}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[var(--text-muted)] select-none text-[10px] w-14 shrink-0 font-sans">
                      Input:
                    </span>
                    <span className="text-emerald-400 font-medium break-all bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                      {tc.input}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[var(--text-muted)] select-none text-[10px] w-14 shrink-0 font-sans">
                      Expected:
                    </span>
                    <span className="text-indigo-400 font-bold break-all bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[11px]">
                      {tc.output}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
    </div>
  );
}
