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
You are a Principal Software Engineer and Staff-level Code Reviewer known for your meticulous, constructive, and highly educational code reviews.
Your goal is to analyze the provided ${language} code and deliver feedback that helps the candidate elevate their coding standards to production-grade quality.

Code to review:
\`\`\`${language}
${code}
\`\`\`

CRITICAL REVIEW DIMENSIONS:
1. **Algorithmic Efficiency**: Analyze the Big-O time and space complexity. Identify any unnecessary bottlenecks or memory allocations.
2. **Code Quality & Readability**: Evaluate naming conventions, modularity, and adherence to ${language} language idioms and best practices.
3. **Edge Cases & Robustness**: Identify unhandled edge cases, potential null pointer exceptions, or lack of input validation.
4. **Production Readiness**: Assess if this code is ready for a high-scale production environment.

Return exactly this JSON structure (and ONLY this JSON, no markdown formatting or extra text outside the braces):
{
  "overall": "A sharp, 2-3 sentence executive summary of the code's quality, functionality, and primary area for growth.",
  "timeComplexity": "O(?) - Provide the Big-O notation with a brief, 1-sentence mathematical justification.",
  "spaceComplexity": "O(?) - Provide the Big-O notation with a brief, 1-sentence justification regarding memory allocation.",
  "strengths": [
    "Identify a specific smart algorithmic choice or elegant syntax usage",
    "Identify a good practice followed (e.g., readability, immutability)"
  ],
  "improvements": [
    "Point out a specific performance bottleneck or edge case missed",
    "Suggest a specific refactor for better idiomatic ${language} usage",
    "Suggest an architectural or robustness improvement"
  ],
  "optimizedCode": "Provide the fully refactored, production-ready version of the code that addresses all improvements. Ensure it is beautifully formatted, well-commented, and highly optimized."
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
