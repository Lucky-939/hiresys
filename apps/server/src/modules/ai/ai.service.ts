import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
});

export async function generateText(prompt: string): Promise<string> {
  try {
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    if (error?.status === 429) {
      throw new Error("AI quota exceeded. Please wait a moment and try again.");
    }
    throw new Error("AI service failed: " + error?.message);
  }
}
