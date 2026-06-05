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
You are an expert technical recruiter and resume coach.
Analyze this resume and return feedback as JSON only, no other text:

RESUME:
${resumeText.slice(0, 8000)}

Return exactly this JSON structure:
{
  "score": <number 0-100>,
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["specific suggestion 1", "specific suggestion 2", "specific suggestion 3"],
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "atsScore": <number 0-100 representing ATS compatibility>
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
