import { generateText } from "./ai.service";
import { getCache, setCache } from "../../config/cache";

type Difficulty = "easy" | "medium" | "hard";

export async function generateInterviewQuestions(
  role: string,
  difficulty: Difficulty,
  count: number = 5,
): Promise<string[]> {
  const cacheKey = `questions:${role.toLowerCase().replace(/\s+/g, "-")}:${difficulty}:${count}`;

  const cached = await getCache<string[]>(cacheKey);
  if (cached) {
    console.log(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  console.log(`Cache MISS: ${cacheKey} — calling Gemini`);

  const prompt = `
You are an expert technical interviewer at a top tech company.
Generate exactly ${count} ${difficulty} difficulty interview questions for a ${role} position.

Rules:
- Questions must be technical and specific to the role
- Mix conceptual and practical questions
- Each question should be answerable in 10-15 minutes
- Do NOT include answers
- Return ONLY a JSON array of strings, no other text

Example format:
["Question 1?", "Question 2?", "Question 3?"]
`;

  const raw = await generateText(prompt);

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);
    if (!Array.isArray(questions)) throw new Error("Not an array");
    await setCache(cacheKey, questions);
    return questions;
  } catch {
    return raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .slice(0, count);
  }
}
