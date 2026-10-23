import { generateText } from "./ai.service";

export interface FollowUpQuestion {
  category: "Optimization" | "Edge Cases" | "Trade-offs" | "System Scaling";
  question: string;
  expectedAnswer: string;
  whatToLookFor: string;
}

export interface FollowUpResult {
  overallSummary: string;
  questions: FollowUpQuestion[];
}

export async function generateFollowUpQuestions(
  code: string,
  language: string,
  problemStatement?: string,
  testSummary?: { passedCount: number; totalCount: number }
): Promise<FollowUpResult> {
  const prompt = `
You are a Staff Software Engineer and Senior Technical Interviewer conducting a live technical interview (e.g. over Google Meet).
The candidate has just submitted their ${language} solution to a coding challenge.

Problem:
${problemStatement || "Technical Coding Problem"}

Candidate's Submitted Code:
\`\`\`${language}
${code}
\`\`\`

Test Suite Results:
${
  testSummary
    ? `${testSummary.passedCount} out of ${testSummary.totalCount} test cases passed (${Math.round(
        (testSummary.passedCount / (testSummary.totalCount || 1)) * 100
      )}%).`
    : "Code executed against test suite."
}

YOUR TASK:
Generate exactly 3 targeted, insightful follow-up questions for the recruiter to ask the candidate live over Google Meet based on their actual implementation.
Focus on:
1. Optimization / Space-Time Tradeoffs: (e.g. Can we optimize O(N) auxiliary space to O(1) in-place? Can nested loops be eliminated?)
2. Edge Cases & Hidden Failure Modes: (e.g. Empty collections, negative values, integer overflow, duplicate keys, huge scale)
3. Architecture & Tradeoffs: (e.g. Why this data structure vs another? Recursion vs Iteration stack depth, cache locality)

Return ONLY valid JSON in this exact structure (no markdown outside the braces):
{
  "overallSummary": "Brief 1-2 sentence performance assessment of the candidate's approach and test results.",
  "questions": [
    {
      "category": "Optimization",
      "question": "The specific question the recruiter should ask the candidate live over Google Meet",
      "expectedAnswer": "What a strong, hire-level candidate should answer",
      "whatToLookFor": "Key concepts (e.g. Two pointers, Hash table vs array, In-place mutation)"
    },
    {
      "category": "Edge Cases",
      "question": "A specific edge case question probing their code's boundary conditions",
      "expectedAnswer": "How their code behaves or how they would patch it",
      "whatToLookFor": "Defensive checks, boundary validation, off-by-one errors"
    },
    {
      "category": "Trade-offs",
      "question": "A conceptual trade-off or scaling question about their algorithm",
      "expectedAnswer": "The engineering trade-offs of their design choice",
      "whatToLookFor": "Memory overhead, time-space balance, production scalability"
    }
  ]
}
`;

  try {
    const raw = await generateText(prompt);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed as FollowUpResult;
    }
  } catch (err) {
    console.error("[FollowUpService] Error parsing AI response, using smart fallback:", err);
  }

  // Robust fallback if AI response parsing fails
  return {
    overallSummary: `Candidate implemented a ${language} solution passing ${
      testSummary?.passedCount ?? "all"
    } test cases. Solid algorithmic foundation with room for in-place optimization.`,
    questions: [
      {
        category: "Optimization",
        question:
          "You used additional auxiliary memory in your solution. Can you explain how you would optimize this algorithm to run in O(1) space without extra memory?",
        expectedAnswer:
          "The candidate should describe an in-place pointer approach or in-place sorting to eliminate auxiliary hash tables or arrays.",
        whatToLookFor: "Understanding space vs time trade-offs, pointer arithmetic, memory allocation overhead",
      },
      {
        category: "Edge Cases",
        question:
          "How does your implementation handle extreme inputs, such as an empty input, single-element collections, or duplicate items?",
        expectedAnswer:
          "The candidate should trace line by line where boundary validations happen and explain how collision or empty scenarios are guarded.",
        whatToLookFor: "Defensive coding, null checks, edge condition handling",
      },
      {
        category: "Trade-offs",
        question:
          "Why did you choose this data structure and paradigm over alternatives? What are the scalability implications if the input size grows to 10 million records?",
        expectedAnswer:
          "The candidate should discuss memory fragmentation, cache locality, and potential overhead (like hashing collisions or garbage collection).",
        whatToLookFor: "System scalability, cache friendliness, production readiness",
      },
    ],
  };
}
