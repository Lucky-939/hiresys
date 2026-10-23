"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
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

export function parseProblemText(text: string): ParsedProblem {
  if (!text) {
    return {
      title: "",
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
  const descriptionParts: string[] = [];
  let functionSignature: string | undefined;
  const examples: TestCase[] = [];
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

    // 1. Same-line Input & Output (e.g. Input: s = "()[]{}" -> Output: true or Input: s = "(]" -> Output: false)
    if (/^input\s*:/i.test(line) && /output\s*:/i.test(line)) {
      if (currentExample && currentExample.input && currentExample.output) {
        examples.push({
          index: examples.length + 1,
          input: currentExample.input,
          output: currentExample.output,
          explanation: currentExample.explanation,
        });
        currentExample = null;
      }
      const parts = line.split(/(?:->|=>|,\s*output\s*:|\s+output\s*:)/i);
      const inVal = parts[0].replace(/^input\s*:\s*/i, "").trim();
      const outVal = (parts[1] || "").replace(/^output\s*:\s*/i, "").replace(/[\(\[\{]?notes?.*$/i, "").trim();
      examples.push({
        index: examples.length + 1,
        input: inVal,
        output: outVal,
      });
      continue;
    }

    // 2. Detect Example markers
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

    // 3. Detect Input in example
    if (/^input\s*:/i.test(line)) {
      if (currentExample && currentExample.input && currentExample.output) {
        examples.push({
          index: examples.length + 1,
          input: currentExample.input,
          output: currentExample.output,
          explanation: currentExample.explanation,
        });
        currentExample = null;
      }
      const inputVal = line.replace(/^input\s*:\s*/i, "").trim();
      if (!currentExample) currentExample = { index: examples.length + 1 };
      currentExample.input = inputVal;
      continue;
    }

    // 4. Detect Output in example
    if (/^output\s*:/i.test(line)) {
      const outputVal = line.replace(/^output\s*:\s*/i, "").trim();
      if (!currentExample) currentExample = { index: examples.length + 1 };
      currentExample.output = outputVal;
      continue;
    }

    // 5. Detect Explanation
    if (/^explanation\s*:/i.test(line)) {
      const explanationVal = line.replace(/^explanation\s*:\s*/i, "").trim();
      if (currentExample) currentExample.explanation = explanationVal;
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
    examples.push({
      index: examples.length + 1,
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

  // If no examples were parsed, generate guaranteed 3 default test cases based on signature/description
  if (examples.length === 0) {
    const sig = (functionSignature || "").toLowerCase();
    const desc = text.toLowerCase();

    if (sig.includes("isvalid") || desc.includes("parentheses")) {
      examples.push(
        { index: 1, input: 's = "()[]{}"', output: "true" },
        { index: 2, input: 's = "(]"', output: "false" },
        { index: 3, input: 's = "{[]}"', output: "true" },
      );
    } else if (sig.includes("twosum") || desc.includes("two sum") || desc.includes("target")) {
      examples.push(
        { index: 1, input: "nums = [2, 7, 11, 15], target = 9", output: "[0, 1]" },
        { index: 2, input: "nums = [3, 2, 4], target = 6", output: "[1, 2]" },
        { index: 3, input: "nums = [3, 3], target = 6", output: "[0, 1]" },
      );
    } else if (sig.includes("containsduplicate") || desc.includes("duplicate")) {
      examples.push(
        { index: 1, input: "nums = [1, 2, 3, 1]", output: "true" },
        { index: 2, input: "nums = [1, 2, 3, 4]", output: "false" },
        { index: 3, input: "nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]", output: "true" },
      );
    } else if (sig.includes("maxprofit") || desc.includes("stock")) {
      examples.push(
        { index: 1, input: "prices = [7, 1, 5, 3, 6, 4]", output: "5" },
        { index: 2, input: "prices = [7, 6, 4, 3, 1]", output: "0" },
        { index: 3, input: "prices = [1, 2]", output: "1" },
      );
    } else if (sig.includes("ispalindrome") || desc.includes("palindrome")) {
      examples.push(
        { index: 1, input: 's = "A man, a plan, a canal: Panama"', output: "true" },
        { index: 2, input: 's = "race a car"', output: "false" },
        { index: 3, input: 's = " "', output: "true" },
      );
    }
  }

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

  // Manage test cases state
  const [localTestCases, setLocalTestCases] = useState<TestCase[]>([]);
  const [isAddingCase, setIsAddingCase] = useState(false);
  const [newCaseInput, setNewCaseInput] = useState("");
  const [newCaseOutput, setNewCaseOutput] = useState("");

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

  const handleAddCustomTestCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseInput.trim() || !newCaseOutput.trim()) {
      toast.error("Please provide both Input and Expected Output.");
      return;
    }

    const newCase: TestCase = {
      index: activeCases.length + 1,
      input: newCaseInput.trim(),
      output: newCaseOutput.trim(),
    };

    const updated = [...activeCases, newCase];
    setLocalTestCases(updated);
    onTestCasesChange?.(updated);
    setNewCaseInput("");
    setNewCaseOutput("");
    setIsAddingCase(false);
    toast.success(`Added Test Case ${newCase.index}!`);
  };

  const handleDeleteTestCase = (indexToDelete: number) => {
    const updated = activeCases
      .filter((tc) => tc.index !== indexToDelete)
      .map((tc, idx) => ({ ...tc, index: idx + 1 }));
    setLocalTestCases(updated);
    onTestCasesChange?.(updated);
    toast.info("Test case removed");
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
          </div>
          <pre className="font-mono text-xs text-sky-200 overflow-x-auto whitespace-pre">
            <code>{parsed.functionSignature}</code>
          </pre>
        </div>
      )}

      {/* Interactive Test Cases Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <span>🧪</span> Test Cases ({activeCases.length})
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingCase(!isAddingCase)}
            className="h-6 text-[10px] px-2 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
          >
            {isAddingCase ? "Cancel" : "+ Add Test Case"}
          </Button>
        </div>

        {/* Inline Add Test Case Form */}
        {isAddingCase && (
          <form
            onSubmit={handleAddCustomTestCase}
            className="p-3 rounded-[var(--radius-default)] bg-[var(--bg-elevated)] border border-indigo-500/30 space-y-2.5 animate-in fade-in"
          >
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
              Create New Test Case
            </span>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[var(--text-muted)]">Input Arguments:</label>
              <input
                type="text"
                placeholder='e.g. s = "([)]"'
                value={newCaseInput}
                onChange={(e) => setNewCaseInput(e.target.value)}
                className="w-full text-xs font-mono px-2 py-1 bg-[var(--bg-base)] border border-[var(--border-default)] rounded text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[var(--text-muted)]">Expected Return Value:</label>
              <input
                type="text"
                placeholder="e.g. false"
                value={newCaseOutput}
                onChange={(e) => setNewCaseOutput(e.target.value)}
                className="w-full text-xs font-mono px-2 py-1 bg-[var(--bg-base)] border border-[var(--border-default)] rounded text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setIsAddingCase(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-6 text-[10px] px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save Test Case
              </Button>
            </div>
          </form>
        )}

        {/* List of Test Cases */}
        <div className="space-y-2">
          {activeCases.map((tc, idx) => (
            <div
              key={idx}
              className="p-3 rounded-[var(--radius-default)] bg-[var(--bg-base)] border border-[var(--border-divider)] space-y-2 font-mono group hover:border-indigo-500/30 transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Test Case {idx + 1}
                </span>
                {activeCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTestCase(tc.index)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-300 transition-opacity cursor-pointer font-sans"
                    title="Remove test case"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="text-[var(--text-muted)] select-none text-[11px] w-14 shrink-0 font-sans">
                    Input:
                  </span>
                  <span className="text-emerald-400 font-medium break-all bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {tc.input}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[var(--text-muted)] select-none text-[11px] w-14 shrink-0 font-sans">
                    Expected:
                  </span>
                  <span className="text-indigo-400 font-bold break-all bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    {tc.output}
                  </span>
                </div>
              </div>
            </div>
          ))}
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
