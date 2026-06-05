import { generateText } from "./ai.service";

export async function generateCodeFeedback(
  code: string,
  language: string,
): Promise<{
  overall: string;
  timeComplexity: string;
  spaceComplexity: string;
  strengths: string[];
  improvements: string[];
  optimizedCode: string;
}> {
  const prompt = `
You are a senior software engineer doing a code review.
Analyze this ${language} code and return feedback as JSON only, no other text:

\`\`\`${language}
${code}
\`\`\`

Return exactly this JSON structure:
{
  "overall": "2-3 sentence overall assessment",
  "timeComplexity": "O(?) with explanation",
  "spaceComplexity": "O(?) with explanation",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "optimizedCode": "improved version of the code as a string"
}
`;

  const raw = await generateText(prompt);
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      overall: raw,
      timeComplexity: "Unable to analyze",
      spaceComplexity: "Unable to analyze",
      strengths: [],
      improvements: [],
      optimizedCode: code,
    };
  }
}
