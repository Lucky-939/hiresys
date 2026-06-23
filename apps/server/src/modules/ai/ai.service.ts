import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppError } from "../../utils/errors";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-1.5-flash";

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 30000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Circuit Breaker State
let isCircuitOpen = false;
let circuitOpenUntil = 0;
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 5;
const COOLDOWN_PERIOD_MS = 60000; // 1 minute

export async function generateText(prompt: string): Promise<string> {
  // Check Circuit Breaker
  if (isCircuitOpen) {
    if (Date.now() > circuitOpenUntil) {
      // Half-open: try again
      isCircuitOpen = false;
    } else {
      throw new AppError("AI service is currently unavailable. Please try again later.", 503);
    }
  }

  let attempt = 0;
  let useFallback = false;

  while (attempt < MAX_RETRIES) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), REQUEST_TIMEOUT_MS)
      );

      const modelName = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
      const model = genAI.getGenerativeModel({ model: modelName });

      const generatePromise = model.generateContent(prompt);

      const result = (await Promise.race([generatePromise, timeoutPromise])) as any;
      
      // Success: reset circuit breaker
      consecutiveFailures = 0;
      
      return result.response.text();
    } catch (error: any) {
      attempt++;
      consecutiveFailures++;

      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        isCircuitOpen = true;
        circuitOpenUntil = Date.now() + COOLDOWN_PERIOD_MS;
      }

      const isRateLimit = error?.status === 429;
      const isServerError = error?.status === 503 || error?.status === 500;
      const isNetworkError =
        error?.message?.includes("fetch failed") ||
        error?.message?.includes("Request timed out") ||
        error?.message?.includes("ECONNRESET");
      const isModelError = error?.message?.includes("not found") || error?.message?.includes("deprecated");

      // Switch to fallback model on model-specific errors or after 1st attempt failure for server errors
      if (isModelError || (attempt === 1 && isServerError)) {
        useFallback = true;
      }

      if (attempt >= MAX_RETRIES || (!isRateLimit && !isServerError && !isNetworkError && !isModelError)) {
        if (isRateLimit) {
          throw new AppError("AI quota exceeded. Please wait a moment and try again.", 429);
        }
        if (isServerError) {
          throw new AppError(
            "The Google Gemini API is currently experiencing high demand. Please try again in a few seconds.",
            503
          );
        }
        if (error?.message === "Request timed out") {
          throw new AppError("AI request timed out. Please try again later.", 408);
        }
        throw new AppError("AI service failed: " + (error?.message || "Unknown error"), 502);
      }

      const backoffDelay = Math.pow(2, attempt) * 1000;
      await delay(backoffDelay);
    }
  }

  throw new AppError("AI service failed after maximum retries", 502);
}
