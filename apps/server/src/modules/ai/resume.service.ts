import { generateText } from "./ai.service";

export async function analyzeResumeText(resumeText: string, jobDescription?: string): Promise<{
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
  matchedKeywords: string[];
}> {
  const prompt = `
You are a Staff-level Technical Recruiter and an elite Resume Coach at a top-tier FAANG company. 
You are conducting a ruthless but highly constructive review of the candidate's resume. Do NOT use generic praise. Every point must be tied to evidence in the text. Speak directly, avoid corporate fluff, and focus strictly on measurable improvement.
${jobDescription ? `\nAnalyze the resume SPECIFICALLY against the following Job Description:\n---\n${jobDescription.slice(0, 4000)}\n---\n\nAssess how well the candidate's experience, skills, and metrics align with the requirements of this role. Penalize heavily for missing core skills mentioned in the job description.` : ''}

Conduct a deep-dive review of the following resume text:
---
${resumeText.slice(0, 8000)}
---

Return exactly this JSON structure (and ONLY this JSON, no markdown formatting outside the braces):
{
  "score": <number 0-100, penalize heavily for lack of metrics/impact>,
  "scoreExplanation": "Short 1-sentence explanation of why this score was given.",
  "atsScore": <number 0-100, parsability and keyword density>,
  "breakdown": {
    "formatting": <number 0-100>,
    "impact": <number 0-100, metrics, achievements>,
    "keywords": <number 0-100>,
    "clarity": <number 0-100>,
    "brevity": <number 0-100>
  },
  "recruiterPerspective": {
    "firstImpression": "What a recruiter thinks in the first 6 seconds (direct, blunt).",
    "hiringRisks": "The biggest red flags or concerns a hiring manager would have."
  },
  "top3Fixes": [
    {
      "title": "Short title of the fix",
      "severity": "Critical" | "High" | "Medium",
      "description": "What exactly to do to fix this, with a measurable example.",
      "section": "E.g., 'Experience', 'Education', 'Skills'"
    }
  ],
  "strengths": [
    {
      "point": "Specific strength (e.g., 'Strong use of impact metrics')",
      "evidence": "Quote or specific example from the resume proving this."
    }
  ],
  "weaknesses": [
    {
      "issue": "Specific weakness (e.g., 'Vague bullet in Role X')",
      "severity": "High" | "Medium" | "Low",
      "fix": "Actionable, measurable way to rewrite or fix this."
    }
  ],
  "rewrites": [
    {
      "original": "Exact quote of a weak bullet point from the resume.",
      "improved": "Your rewritten version using XYZ format (Accomplished [X] as measured by [Y], by doing [Z]).",
      "whyItWorks": "Short explanation of why the new version is better."
    }
  ],
  "missingKeywords": [
    {
      "keyword": "Crucial missing skill/tool",
      "reason": "Why this matters for their target roles.",
      "whereToAdd": "Specifically where in the resume to add it naturally."
    }
  ],
  "matchedKeywords": ["React", "TypeScript", "Node.js"]
}
`;

  const raw = await generateText(prompt);
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse resume JSON", err);
    return {
      score: 0,
      scoreExplanation: "Failed to parse analysis.",
      atsScore: 0,
      breakdown: { impact: 0, formatting: 0, keywords: 0, clarity: 0, brevity: 0 },
      recruiterPerspective: { firstImpression: "Error processing resume.", hiringRisks: "N/A" },
      top3Fixes: [],
      strengths: [],
      weaknesses: [],
      rewrites: [],
      missingKeywords: [],
      matchedKeywords: []
    };
  }
}
