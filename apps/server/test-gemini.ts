import { config } from "dotenv";
config();

import { generateText } from "./src/modules/ai/ai.service";

async function test() {
  try {
    const role = "Frontend Developer";
    const difficulty = "medium";
    const count = 5;
    const prompt = `
You are a Principal Engineer and Elite Technical Interviewer at a top-tier tech company (like Google or Meta) known for rigorous, high-bar candidate evaluations.

Your task is to generate EXACTLY ${count} highly calibrated interview questions for a ${role} position at a ${difficulty.toUpperCase()} difficulty level.

CRITICAL RULES & GUIDELINES:
1. **Calibrated Difficulty**: The questions must strictly align with the '${difficulty}' level expectations for a ${role}. 
   - *Easy*: Core fundamentals and basic syntax/concepts.
   - *Medium*: Complex state management, architecture decisions, or standard algorithmic problems applied to real-world scenarios.
   - *Hard*: Deep system design, performance optimization at scale, nuanced edge cases, or complex distributed systems problems.
2. **Scenario-Based**: Whenever possible, frame the questions around real-world engineering scenarios rather than academic trivia. Instead of "What is a closure?", ask "Describe a scenario where you would use a closure to solve a specific state encapsulation problem."
3. **Actionable**: Each question should naturally lead to a 10-15 minute deep-dive discussion.
4. **No Answers**: DO NOT provide the answers, hints, or explanations. 
5. **Strict JSON Output**: Return ONLY a valid JSON array of strings representing the questions. Absolutely no markdown blocks (\`\`\`json), no introductory text, and no concluding text.

Example format:
[
  "In a high-traffic e-commerce application, how would you design the data model and caching strategy for a shopping cart to ensure 99.99% availability even if the primary database goes down?",
  "Describe a time you had to optimize a slow-rendering React list with thousands of dynamic items. What specific techniques and performance profiling tools did you use?"
]
`;
    console.log("Testing prompt...");
    const res = await generateText(prompt);
    console.log("SUCCESS");
    console.log(res);
  } catch (err) {
    console.error("ERROR:");
    console.error(err);
  }
}

test();
