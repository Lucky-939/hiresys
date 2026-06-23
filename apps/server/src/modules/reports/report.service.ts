import { generateText } from "../ai/ai.service";
import { ReportRepository } from "./report.repository";
import { AppError } from "../../utils/errors";
import { Recommendation } from "@prisma/client";

const repo = new ReportRepository();

interface ReportInput {
  interviewTitle: string;
  codeSubmitted: string;
  language: string;
  questionsAsked: string[];
  resumeScore?: number;
  interviewNotes?: string;
}

interface GeminiReportResponse {
  codingScore: number;
  problemSolvingScore: number;
  technicalKnowledgeScore: number;
  overallScore: number;
  recommendation: string;
  aiSummary: string;
  strengths: string[];
  improvements: string[];
}

const VALID_RECOMMENDATIONS: string[] = [
  "STRONG_HIRE",
  "HIRE",
  "MAYBE",
  "NO_HIRE",
];

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (isNaN(num)) return 50;
  return Math.max(0, Math.min(100, num));
}

function parseRecommendation(value: unknown): Recommendation {
  const str = String(value).toUpperCase().trim();
  if (VALID_RECOMMENDATIONS.includes(str)) return str as Recommendation;
  return "MAYBE";
}

export async function generateReport(
  interviewId: string,
  input: ReportInput,
) {
  // Check if report already exists
  const existing = await repo.findByInterviewId(interviewId);
  if (existing) {
    throw new AppError("Interview report already exists.", 409);
  }

  const startTime = Date.now();

  const prompt = `
You are a Senior Technical Hiring Manager and Interview Evaluator with deep expertise in assessing software engineering candidates.
Your task is to generate a comprehensive, data-driven evaluation report for a coding interview.

INTERVIEW CONTEXT:
- Role: ${input.interviewTitle}
- Programming Language: ${input.language}
- Resume Score: ${input.resumeScore !== undefined ? `${input.resumeScore}/100` : "Not available"}

CODE SUBMITTED BY CANDIDATE:
\`\`\`${input.language}
${input.codeSubmitted || "No code was submitted during this interview."}
\`\`\`

QUESTIONS ASKED DURING INTERVIEW:
${input.questionsAsked.length > 0 ? input.questionsAsked.map((q, i) => `${i + 1}. ${q}`).join("\n") : "No specific questions were recorded."}

INTERVIEWER NOTES & DISCUSSION:
${input.interviewNotes || "No notes provided."}

EVALUATION CRITERIA:
1. **Coding Score (0-100)**: Evaluate code quality, correctness, efficiency, edge case handling, and adherence to ${input.language} best practices.
2. **Problem Solving Score (0-100)**: Evaluate the candidate's approach to breaking down problems, algorithmic thinking, and ability to arrive at working solutions.
3. **Technical Knowledge Score (0-100)**: Evaluate demonstrated understanding of data structures, algorithms, language-specific features, and software engineering principles based on the code and questions.
4. **Overall Score (0-100)**: A weighted composite reflecting the candidate's total performance. Not a simple average — weight coding at 40%, problem solving at 35%, and technical knowledge at 25%.

RECOMMENDATION GUIDELINES:
- STRONG_HIRE (85-100 overall): Exceptional performance, exceeds expectations
- HIRE (70-84 overall): Solid performance, meets expectations
- MAYBE (50-69 overall): Mixed signals, borderline candidate
- NO_HIRE (0-49 overall): Below expectations, significant gaps

Return ONLY this exact JSON structure (no markdown, no extra text):
{
  "codingScore": <number 0-100>,
  "problemSolvingScore": <number 0-100>,
  "technicalKnowledgeScore": <number 0-100>,
  "overallScore": <number 0-100>,
  "recommendation": "<STRONG_HIRE|HIRE|MAYBE|NO_HIRE>",
  "aiSummary": "<3-5 sentence executive summary of the candidate's performance, key observations, and hiring recommendation rationale>",
  "strengths": [
    "<specific strength with evidence from their code or answers>",
    "<another specific strength>",
    "<another specific strength>"
  ],
  "improvements": [
    "<specific area for improvement with actionable suggestion>",
    "<another area for improvement>",
    "<another area for improvement>"
  ]
}
`;

  const raw = await generateText(prompt);
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed: GeminiReportResponse;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AppError(
      "AI returned an invalid response. Please try generating the report again.",
      502,
    );
  }

  const generationTimeMs = Date.now() - startTime;

  const report = await repo.create({
    interviewId,
    codingScore: clampScore(parsed.codingScore),
    problemSolvingScore: clampScore(parsed.problemSolvingScore),
    technicalKnowledgeScore: clampScore(parsed.technicalKnowledgeScore),
    overallScore: clampScore(parsed.overallScore),
    recommendation: parseRecommendation(parsed.recommendation),
    aiSummary: parsed.aiSummary || "No summary was generated.",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    generationTimeMs,
    // Immutable snapshots — freeze the exact input data used for this evaluation
    snapshotInterviewTitle: input.interviewTitle,
    snapshotCodeSubmitted: input.codeSubmitted || undefined,
    snapshotLanguage: input.language,
    snapshotQuestions: input.questionsAsked.length > 0 ? input.questionsAsked : undefined,
    snapshotResumeScore: input.resumeScore,
    // @ts-ignore Prisma client type is locked by dev server, schema is updated
    snapshotInterviewNotes: input.interviewNotes || undefined,
  });

  return report;
}

export async function getReportByInterviewId(interviewId: string) {
  return repo.findByInterviewId(interviewId);
}
