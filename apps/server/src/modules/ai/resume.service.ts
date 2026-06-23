import { generateText } from "./ai.service";

export async function analyzeResumeText(resumeText: string): Promise<{
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingKeywords: string[];
  atsScore: number;
}> {
  const prompt = `
You are a Staff-level Technical Recruiter and an elite Resume Coach at a top-tier FAANG company. Your goal is to critically analyze the provided resume and deliver highly actionable, precise, and nuanced feedback that will elevate the candidate's profile to the top 1%.

Conduct a deep-dive review of the following resume text:
---
${resumeText.slice(0, 8000)}
---

Your analysis MUST evaluate the resume across the following dimensions:
1. **Impact & Metrics**: Does the candidate use the XYZ formula (Accomplished [X] as measured by [Y], by doing [Z])? Are there quantifiable achievements?
2. **Clarity & Readability**: Is the language concise, impactful, and free of fluff? 
3. **Relevance & ATS Compatibility**: Are industry-standard keywords present without "keyword stuffing"? Is the structure likely to parse well?

Return exactly this JSON structure (and ONLY this JSON, no markdown formatting or extra text outside the braces):
{
  "score": <number 0-100, be strict but fair, penalize heavily for lack of metrics>,
  "summary": "Provide a sharp, 2-3 sentence overall assessment highlighting the resume's primary value proposition and its biggest flaw.",
  "strengths": ["Identify specific, high-impact strength", "Identify structural or content strength", "Identify technical narrative strength"],
  "weaknesses": ["Pinpoint a specific lack of impact/metrics", "Pinpoint structural flaw", "Pinpoint missing context or clarity issue"],
  "suggestions": ["Provide a highly actionable rewriting tip", "Provide a specific metric integration tip", "Suggest an ATS optimization step"],
  "missingKeywords": ["Crucial industry keyword 1", "Missing skill/tool keyword 2", "Missing action verb 3"],
  "atsScore": <number 0-100, evaluate parsability and keyword density>
}
`;

  const raw = await generateText(prompt);
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      score: 0,
      summary: raw,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      missingKeywords: [],
      atsScore: 0,
    };
  }
}
