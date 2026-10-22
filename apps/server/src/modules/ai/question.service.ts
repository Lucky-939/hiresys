import { generateText } from "./ai.service";
import { getCache, setCache } from "../../config/cache";

type Difficulty = "easy" | "medium" | "hard";

export async function generateInterviewQuestions(
  role: string,
  difficulty: Difficulty,
  count: number = 5,
): Promise<string[]> {
  const cacheKey = `leetcode-questions:${role.toLowerCase().replace(/\s+/g, "-")}:${difficulty}:${count}`;

  const cached = await getCache<string[]>(cacheKey);
  if (cached) {
    console.log(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  console.log(`Cache MISS: ${cacheKey} — generating LeetCode coding problems for difficulty: ${difficulty}`);

  const prompt = `
You are a Lead Technical Interviewer at a premier technology company (such as Google, Meta, or Stripe).
Your task is to generate EXACTLY ${count} practical, hands-on LeetCode-style algorithmic CODING CHALLENGES for a live coding interview for a ${role} candidate at ${difficulty.toUpperCase()} difficulty.

CRITICAL REQUIREMENTS FOR EVERY QUESTION:
1. **Must Be a LeetCode-Style Algorithmic Problem**: NOT a theoretical question, NOT a system design discussion, and NOT an essay question. Every single problem must require the candidate to write an executable function in the Monaco code editor.
2. **Clear Problem Statement & Signature**: State the problem clearly and specify the exact function name and arguments (e.g. function solution(nums, target)).
3. **Concrete Test Cases**: Include at least one concrete example with input and expected return value.
4. **Target Algorithmic Complexity**: Specify target time complexity (e.g. O(n) or O(n log n)).
5. **Calibrated strictly to ${difficulty.toUpperCase()}**:
   - Easy: Two Sum, Valid Parentheses, Best Time to Buy and Sell Stock, Valid Palindrome, Contains Duplicate.
   - Medium: Group Anagrams, Longest Substring Without Repeating Characters, Merge Intervals, Product of Array Except Self, Top K Frequent Elements.
   - Hard: Trapping Rain Water, Minimum Window Substring, Sliding Window Maximum, Merge k Sorted Lists, Median of Two Sorted Arrays.
6. **Output Format**: Return ONLY a valid JSON array of ${count} strings. No markdown formatting, no code blocks (\`\`\`json), no introductory text.
`;

  const raw = await generateText(prompt);

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      const validQuestions = parsed
        .filter((q) => typeof q === "string" && !q.trim().startsWith("{") && q.trim().length > 10)
        .slice(0, count);
      if (validQuestions.length > 0) {
        await setCache(cacheKey, validQuestions);
        return validQuestions;
      }
    }
    throw new Error("Invalid questions format");
  } catch {
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

    const pool = difficulty === "easy" ? easyProblems : difficulty === "hard" ? hardProblems : mediumProblems;
    return pool.slice(0, count);
  }
}
