

export function getMockResponse(prompt: string): string {
  // 1. Check if prompt is for Interview Question Generation / Coding Problems
  if (
    prompt.includes("calibrated interview questions") ||
    prompt.includes("generate EXACTLY") ||
    prompt.includes("interview questions for a") ||
    prompt.includes("CODING CHALLENGES") ||
    prompt.includes("LeetCode") ||
    prompt.includes("Return ONLY a valid JSON array of strings")
  ) {
    const countMatch = prompt.match(/generate EXACTLY (\d+)/i) || prompt.match(/(\d+)\s+strings/i);
    const count = countMatch ? parseInt(countMatch[1], 10) : 5;

    const isEasy = /\beasy\b/i.test(prompt);
    const isHard = /\bhard\b/i.test(prompt);

    const easyProblems = [
      "LeetCode #1: Two Sum\nGiven an array of integers 'nums' and an integer 'target', return indices of the two numbers such that they add up to target.\nFunction: function twoSum(nums, target)\nExample:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1] (because nums[0] + nums[1] == 9)\nTarget Complexity: O(n) time, O(n) space.",
      "LeetCode #20: Valid Parentheses\nGiven a string 's' containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid (brackets must close in correct order).\nFunction: function isValid(s)\nExample:\nInput: s = \"()[]{}\" -> Output: true\nInput: s = \"(]\" -> Output: false\nTarget Complexity: O(n) time using a stack.",
      "LeetCode #121: Best Time to Buy and Sell Stock\nGiven an array 'prices' where prices[i] is the stock price on day i, return the maximum profit achievable by buying on one day and selling on a future day. Return 0 if no profit.\nFunction: function maxProfit(prices)\nExample:\nInput: prices = [7, 1, 5, 3, 6, 4]\nOutput: 5 (Buy at day 2 price 1, sell at day 5 price 6)\nTarget Complexity: O(n) time, O(1) space.",
      "LeetCode #125: Valid Palindrome\nGiven a string 's', return true if it is a palindrome, considering only alphanumeric characters and ignoring case.\nFunction: function isPalindrome(s)\nExample:\nInput: s = \"A man, a plan, a canal: Panama\"\nOutput: true\nTarget Complexity: O(n) time, O(1) space.",
      "LeetCode #217: Contains Duplicate\nGiven an integer array 'nums', return true if any value appears at least twice in the array, and return false if every element is distinct.\nFunction: function containsDuplicate(nums)\nExample:\nInput: nums = [1, 2, 3, 1]\nOutput: true\nInput: nums = [1, 2, 3, 4]\nOutput: false\nTarget Complexity: O(n) time using a hash set."
    ];

    const mediumProblems = [
      "LeetCode #49: Group Anagrams\nGiven an array of strings 'strs', group the anagrams together in any order.\nFunction: function groupAnagrams(strs)\nExample:\nInput: strs = [\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"]\nOutput: [[\"bat\"], [\"nat\", \"tan\"], [\"ate\", \"eat\", \"tea\"]]\nTarget Complexity: O(n * k log k) where k is max string length.",
      "LeetCode #3: Longest Substring Without Repeating Characters\nGiven a string 's', find the length of the longest substring without duplicate characters.\nFunction: function lengthOfLongestSubstring(s)\nExample:\nInput: s = \"abcabcbb\"\nOutput: 3 (the substring is \"abc\")\nInput: s = \"bbbbb\"\nOutput: 1\nTarget Complexity: O(n) using sliding window.",
      "LeetCode #56: Merge Intervals\nGiven an array of 'intervals' where intervals[i] = [start, end], merge all overlapping intervals and return the non-overlapping intervals.\nFunction: function merge(intervals)\nExample:\nInput: intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]\nOutput: [[1, 6], [8, 10], [15, 18]]\nTarget Complexity: O(n log n) time.",
      "LeetCode #238: Product of Array Except Self\nGiven an integer array 'nums', return an array 'answer' such that answer[i] is equal to the product of all elements of nums except nums[i]. Must run in O(n) time without division.\nFunction: function productExceptSelf(nums)\nExample:\nInput: nums = [1, 2, 3, 4]\nOutput: [24, 12, 8, 6]\nTarget Complexity: O(n) time, O(1) auxiliary space.",
      "LeetCode #347: Top K Frequent Elements\nGiven an integer array 'nums' and an integer 'k', return the 'k' most frequent elements.\nFunction: function topKFrequent(nums, k)\nExample:\nInput: nums = [1, 1, 1, 2, 2, 3], k = 2\nOutput: [1, 2]\nTarget Complexity: O(n log k) time or O(n) bucket sort."
    ];

    const hardProblems = [
      "LeetCode #42: Trapping Rain Water\nGiven 'n' non-negative integers representing an elevation map where width of each bar is 1, compute how much water it can trap after raining.\nFunction: function trap(height)\nExample:\nInput: height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\nOutput: 6\nTarget Complexity: O(n) time, O(1) space using two pointers.",
      "LeetCode #76: Minimum Window Substring\nGiven strings 's' and 't', return the minimum window substring of 's' such that every character in 't' (with duplicates) is included. Return \"\" if no such substring exists.\nFunction: function minWindow(s, t)\nExample:\nInput: s = \"ADOBECODEBANC\", t = \"ABC\"\nOutput: \"BANC\"\nTarget Complexity: O(m + n) time using sliding window.",
      "LeetCode #239: Sliding Window Maximum\nGiven an array of integers 'nums' and a sliding window of size 'k' moving from left to right, return the max sliding window array.\nFunction: function maxSlidingWindow(nums, k)\nExample:\nInput: nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3\nOutput: [3, 3, 5, 5, 6, 7]\nTarget Complexity: O(n) time using monotonic deque.",
      "LeetCode #23: Merge k Sorted Lists\nGiven an array of 'k' linked lists, each sorted in ascending order, merge all lists into one sorted list.\nFunction: function mergeKLists(lists)\nExample:\nInput: lists = [[1, 4, 5], [1, 3, 4], [2, 6]]\nOutput: [1, 1, 2, 3, 4, 4, 5, 6]\nTarget Complexity: O(N log k) where N is total node count.",
      "LeetCode #4: Median of Two Sorted Arrays\nGiven two sorted arrays 'nums1' and 'nums2' of sizes 'm' and 'n', return the median of the two sorted arrays.\nFunction: function findMedianSortedArrays(nums1, nums2)\nExample:\nInput: nums1 = [1, 3], nums2 = [2]\nOutput: 2.0\nTarget Complexity: O(log(min(m, n))) binary search."
    ];

    const selectedPool = isEasy ? easyProblems : isHard ? hardProblems : mediumProblems;
    return JSON.stringify(selectedPool.slice(0, count));
  }

  // 2. Check if prompt is for Code Feedback / Code Review
  if (
    prompt.includes("Staff-level Code Reviewer") ||
    prompt.includes("CRITICAL REVIEW DIMENSIONS") ||
    prompt.includes("Code to review:")
  ) {
    return JSON.stringify({
      overall: "The solution demonstrates clean syntax, solid modularity, and good understanding of standard data structures. Algorithmic efficiency can be improved by replacing nested iterations with a hash map lookup.",
      timeComplexity: "O(n) - Single pass through the input elements utilizing hash-based frequency lookup.",
      spaceComplexity: "O(n) - Auxiliary space allocated for the tracking hash map proportional to unique elements.",
      strengths: [
        "Clean, readable variable naming and standard idiom usage",
        "Clear handling of basic empty and null boundary conditions",
        "Sensible modular structure suitable for unit testing"
      ],
      improvements: [
        "Optimize lookup from O(n^2) nested scan to O(n) utilizing a Map/Set",
        "Add explicit validation for non-numeric or malformed input types",
        "Consider using immutable data transformations to avoid accidental side-effects"
      ],
      optimizedCode: "// Production-ready refactor with O(n) time complexity\nfunction solution(input) {\n  if (!Array.isArray(input) || input.length === 0) return [];\n  const seen = new Set();\n  const result = [];\n  for (const item of input) {\n    if (!seen.has(item)) {\n      seen.add(item);\n      result.push(item);\n    }\n  }\n  return result;\n}"
    });
  }

  // 2b. Check if prompt is for Live Performance Follow-Up Questions (over Google Meet)
  if (
    prompt.includes("Senior Technical Interviewer") ||
    prompt.includes("targeted, insightful follow-up questions") ||
    prompt.includes("follow-up questions for the recruiter")
  ) {
    return JSON.stringify({
      overallSummary: "Candidate implemented a functional working solution handling standard test cases. Space complexity can be optimized from O(N) to O(1).",
      questions: [
        {
          category: "Optimization",
          question: "You used extra auxiliary memory in your solution. Can you explain how you would optimize this algorithm to run in O(1) auxiliary space without using a secondary hash map?",
          expectedAnswer: "Yes, by sorting the array in-place or utilizing a two-pointer sliding technique, we can eliminate the map and achieve O(1) space.",
          whatToLookFor: "Understanding space vs time trade-offs, two-pointer approach, in-place manipulation"
        },
        {
          category: "Edge Cases",
          question: "How does your code handle extreme boundary conditions like an empty input, integer overflow, or duplicate values?",
          expectedAnswer: "Candidate should pinpoint where null or empty checks occur and how duplicate entries affect map lookups or loops.",
          whatToLookFor: "Defensive programming, validation before indexing, collision handling"
        },
        {
          category: "Trade-offs",
          question: "Why did you choose this data structure over alternatives? What are the cache locality and memory fragmentation implications at scale?",
          expectedAnswer: "Hash maps provide O(1) average lookup but incur pointer indirection and re-hashing overhead compared to contiguous arrays.",
          whatToLookFor: "Knowledge of data structure internals, cache friendliness, production considerations"
        }
      ]
    });
  }

  // 3. Check if prompt is for resume analysis
  if (prompt.includes("Resume Coach") || prompt.includes("Staff-level Technical Recruiter") || prompt.includes("resume")) {
    const isYash = prompt.includes("YASH") || prompt.includes("NALAWADE") || prompt.includes("message broker") || prompt.includes("270");
    const score = isYash ? 94 : 88;

    return JSON.stringify({
      score: score,
      scoreExplanation: isYash 
        ? "Exceptional technical profile. Demonstrated high-impact engineering with a custom message broker handling 100k+ msg/sec and a 270x latency reduction. Strong production proficiency across React, Node.js, TypeScript, and distributed systems architecture."
        : "Strong alignment with full-stack engineering requirements. Demonstrates hands-on experience in React, Node.js, and relational databases with clear project ownership.",
      atsScore: isYash ? 96 : 90,
      breakdown: {
        impact: isYash ? 96 : 88,
        formatting: 95,
        keywords: isYash ? 94 : 85,
        clarity: 92,
        brevity: 90,
      },
      recruiterPerspective: {
        firstImpression: isYash
          ? "Top-tier candidate. Quantified architectural achievements (100k msg/sec, 270x latency) immediately stand out. Clear fit for distributed systems and full-stack engineering."
          : "Solid full-stack developer with well-structured achievements and hands-on system design experience.",
        hiringRisks: isYash
          ? "Candidate is strong; probe deeply on edge-case consensus and recovery scenarios in the custom broker during the live interview."
          : "Verify depth of experience in high-concurrency PostgreSQL optimization during the technical round.",
      },
      top3Fixes: [
        {
          title: "Detail Infrastructure Deployment",
          severity: "Low",
          description: "Explicitly highlight Kubernetes or container orchestration patterns used when deploying the message broker.",
          section: "Projects",
        },
        {
          title: "Highlight Team Collaboration",
          severity: "Low",
          description: "Mention cross-functional collaboration and code review practices on production systems.",
          section: "Experience",
        },
      ],
      strengths: isYash ? [
        { point: "High-Throughput Distributed Architecture", evidence: "Engineered a message broker handling 100,000+ messages/sec with 270x latency reduction." },
        { point: "Production Full-Stack Stack", evidence: "Hands-on mastery of React, Node.js, TypeScript, PostgreSQL, and scalable microservices." },
        { point: "Measurable Engineering Impact", evidence: "Clear quantitative results: 200+ active users served, 270x performance gain." },
      ] : [
        { point: "Modern Web Architecture", evidence: "Demonstrated production experience with Next.js, TypeScript, and REST/WebSocket architectures." },
        { point: "Database Mastery", evidence: "Solid experience modeling relational schemas and optimizing PostgreSQL queries." },
      ],
      weaknesses: [
        { issue: "Add more details on production monitoring", severity: "Low", fix: "Mention observability tools (Prometheus, Grafana, OpenTelemetry) used in past projects." },
      ],
      rewrites: [],
      missingKeywords: [],
      matchedKeywords: isYash 
        ? ["React", "Node.js", "TypeScript", "PostgreSQL", "Distributed Systems", "Full-Stack", "Message Broker", "Docker", "Latency Optimization"]
        : ["React", "Node.js", "TypeScript", "PostgreSQL", "Full Stack"],
    });
  }

  // 4. Check if prompt is for interview report / evaluation scorecard
  if (
    prompt.includes("codingScore") ||
    prompt.includes("problemSolvingScore") ||
    prompt.includes("technicalKnowledgeScore") ||
    prompt.includes("overallScore") ||
    prompt.includes("scorecard") ||
    prompt.includes("recommendation")
  ) {
    return JSON.stringify({
      codingScore: 92,
      problemSolvingScore: 90,
      technicalKnowledgeScore: 88,
      overallScore: 90,
      score: 90,
      recommendation: "STRONG_HIRE",
      aiSummary: "Candidate demonstrated exceptional coding proficiency, clean modular structure, and strong algorithmic problem solving.",
      summary: "Candidate demonstrated exceptional coding proficiency, clean modular structure, and strong algorithmic problem solving.",
      codeQuality: 92,
      problemSolving: 90,
      communication: 88,
      strengths: [
        "Clean idiomatic code with high modularity and separation of concerns",
        "Optimal algorithmic time complexity with proactive edge-case validation",
        "Clear articulation of architectural tradeoffs during discussion"
      ],
      improvements: [
        "Could articulate memory and space complexity earlier in the session",
        "Consider discussing edge conditions for distributed failover scenarios"
      ],
      weaknesses: [
        "Could articulate memory complexity earlier in the session"
      ],
    });
  }

  // Default fallback JSON
  return JSON.stringify([
    "How do you design scalable APIs that handle millions of requests?",
    "Describe your experience with distributed systems and caching strategies.",
    "How do you optimize front-end rendering performance for complex user interfaces?"
  ]);
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppError } from "../../utils/errors";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-1.5-flash";

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 90000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Circuit Breaker State
let isCircuitOpen = false;
let circuitOpenUntil = 0;
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 5;
const COOLDOWN_PERIOD_MS = 60000; // 1 minute

export async function generateText(prompt: string): Promise<string> {
  if (process.env.MOCK_GEMINI === "true") {
    console.log("[AI Service] MOCK_GEMINI=true: Returning realistic mock AI response.");
    return getMockResponse(prompt);
  }
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
