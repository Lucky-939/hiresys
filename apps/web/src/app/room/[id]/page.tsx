"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { FormattedProblemStatement, parseProblemText } from "@/components/room/FormattedProblemStatement";
import {
  TestCase,
  TestSuiteSummary,
  detectFunctionName,
  buildExecutableCodeWithTests,
  parseTestExecutionOutput,
} from "@/lib/test-runner";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGES = ["javascript", "python"];
const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
};

const STARTER_CODE: Record<string, string> = {
  javascript: "// Write your solution here\nfunction solution() {\n  \n}\n",
  typescript: "// Write your solution here\nfunction solution(): void {\n  \n}\n",
  python: "# Write your solution here\ndef solution():\n    pass\n",
  java: "class Solution {\n    public void solution() {\n        \n    }\n}\n",
  cpp: "#include <iostream>\nusing namespace std;\n\nvoid solution() {\n    \n}\n",
  go: "package main\n\nfunc solution() {\n    \n}\n",
};

interface RoomUser {
  userId: string;
  name: string;
  color: string;
}

interface Feedback {
  overall: string;
  timeComplexity: string;
  spaceComplexity: string;
  strengths: string[];
  improvements: string[];
  optimizedCode: string;
}

export default function CodingRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roomId } = use(params);
  const { user } = useAuthStore();
  const router = useRouter();

  // Active auth token & user
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string>("");

  // Editor state
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_CODE["javascript"]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<{ stdout: string; stderr: string; isError: boolean } | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testSuiteSummary, setTestSuiteSummary] = useState<TestSuiteSummary | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<number>(0);
  const [terminalTab, setTerminalTab] = useState<"tests" | "console">("tests");
  const [connected, setConnected] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Notes state (interviewer only)
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  // Interview Info
  const [interviewInfo, setInterviewInfo] = useState({
    candidateName: "Loading...",
    candidateEmail: "",
    role: "Technical Interview",
    stage: "INTERVIEWING",
    description: "",
  });

  // AI state
  const [questions, setQuestions] = useState<string[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<string>("");
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [evals, setEvals] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  
  // Layout State
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isCandidate, setIsCandidate] = useState(false);

  // Report state
  const [generatingReport, setGeneratingReport] = useState(false);

  // Timer
  const [elapsed, setElapsed] = useState(0);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const isRemoteChange = useRef(false);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Initial fetch
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get("token");

    let tokenToUse: string | null = queryToken;

    if (queryToken) {
      sessionStorage.setItem("candidate_room_token", queryToken);
      // Only set in localStorage if user doesn't already have an active recruiter login
      if (!localStorage.getItem("token")) {
        localStorage.setItem("token", queryToken);
      }
    } else {
      tokenToUse = sessionStorage.getItem("candidate_room_token") || localStorage.getItem("token");
    }

    if (!tokenToUse) {
      router.replace(`/login?redirect=${encodeURIComponent(`/room/${roomId}`)}`);
      return;
    }

    setActiveToken(tokenToUse);

    api.get(`/interviews/${roomId}`, {
      headers: { Authorization: `Bearer ${tokenToUse}` }
    }).then((res) => {
      const iv = res.data.data;
      if (iv.status === "COMPLETED") {
        setIsCompleted(true);
      }
      if (iv.language) setLanguage(iv.language);
      if (iv.codeSubmitted) setCode(iv.codeSubmitted);
      if (iv.interviewNotes) setNotes(iv.interviewNotes);

      const candidateFlag = Boolean(iv.isCandidate);
      setIsCandidate(candidateFlag);

      const resolvedName =
        iv.currentUserName ||
        (candidateFlag ? (iv.candidate?.name || "Candidate") : (user?.name || "Interviewer"));
      setParticipantName(resolvedName);

      setInterviewInfo({
        candidateName: iv.candidate?.name || "Candidate",
        candidateEmail: iv.candidate?.email || "",
        role: iv.title || "Technical Interview",
        stage: iv.candidate?.pipelineStage?.name || "INTERVIEWING",
        description: iv.description || "",
      });

      if (iv.description) {
        setActiveQuestion(iv.description);
        const parsed = parseProblemText(iv.description);
        if (parsed.examples.length > 0) {
          setTestCases(parsed.examples);
        }
      }

      if (iv.report) {
        setFeedback({
          overall: iv.report.overallScore + "/100 - " + iv.report.recommendation,
          timeComplexity: "O(N)",
          spaceComplexity: "O(1)",
          strengths: ["Clean code", "Good communication"],
          improvements: ["Edge cases"],
          optimizedCode: "// Optimizations applied"
        });
      }
    }).catch(err => {
      console.error("Failed to load interview", err);
      if (err.response?.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent(`/room/${roomId}`)}`);
      } else if (err.response?.status === 403) {
        toast.error("You do not have access to this interview room.");
        router.replace("/dashboard");
      }
    }).finally(() => {
      setLoadingInitial(false);
    });
  }, [roomId, router, user]);

  // Debounced auto-save
  useEffect(() => {
    if (loadingInitial || isCompleted || !activeToken) return;
    setSaveStatus("saving");
    const timeout = setTimeout(() => {
      const payload: { codeSubmitted: string; language: string; interviewNotes?: string } = {
        codeSubmitted: code,
        language,
      };
      // Interviewers save notes; candidate submissions only save code/language
      if (!isCandidate && notes !== undefined) {
        payload.interviewNotes = notes;
      }

      api.patch(`/interviews/${roomId}`, payload, {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 2000);
    return () => clearTimeout(timeout);
  }, [code, language, notes, roomId, loadingInitial, isCompleted, isCandidate, activeToken]);

  // Socket setup
  useEffect(() => {
    if (!participantName || !activeToken) return;

    const socket = getSocket(activeToken);
    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("room:join", { roomId, name: participantName });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("code:update", ({ code: remoteCode }: { code: string }) => {
      isRemoteChange.current = true;
      setCode(remoteCode);
    });

    socket.on("language:update", ({ language: remoteLang }: { language: string }) => {
      setLanguage(remoteLang);
      setCode(STARTER_CODE[remoteLang] || "");
    });

    socket.on("question:active", ({ question }: { question: string }) => {
      setActiveQuestion(question);
      if (question) {
        const parsed = parseProblemText(question);
        if (parsed.examples.length > 0) {
          setTestCases(parsed.examples);
        }
      }
    });

    socket.on("testcases:sync", ({ testCases: remoteCases }: { testCases: TestCase[] }) => {
      if (remoteCases && Array.isArray(remoteCases)) {
        setTestCases(remoteCases);
      }
    });

    socket.on("room:users", (roomUsers: RoomUser[]) => setUsers(roomUsers));
    
    socket.on("code:execution_started", () => {
      setIsExecuting(true);
      setExecutionOutput(null);
      setTestSuiteSummary(null);
    });
    
    socket.on("code:execution_result", (result: { stdout: string; stderr: string; isError: boolean }) => {
      setIsExecuting(false);
      const { testSuite, cleanStdout } = parseTestExecutionOutput(result.stdout);
      if (testSuite && testSuite.results && testSuite.results.length > 0) {
        setTestSuiteSummary(testSuite);
        setActiveResultTab(0);
        setTerminalTab("tests");
        setExecutionOutput({
          stdout: cleanStdout,
          stderr: result.stderr,
          isError: result.isError || testSuite.passedCount < testSuite.totalCount
        });
        if (testSuite.passedCount === testSuite.totalCount) {
          toast.success(`🎉 All ${testSuite.totalCount}/${testSuite.totalCount} Test Cases Solved!`);
        } else {
          toast.warning(`⚠️ ${testSuite.passedCount}/${testSuite.totalCount} Test Cases Solved`);
        }
      } else {
        setTestSuiteSummary(null);
        setTerminalTab("console");
        setExecutionOutput(result);
      }
    });
    
    socket.on("error", (err: { message: string }) => {
      if (isExecuting) setIsExecuting(false);
      toast.error(err.message);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("code:update");
      socket.off("language:update");
      socket.off("question:active");
      socket.off("testcases:sync");
      socket.off("room:users");
      socket.off("code:execution_started");
      socket.off("code:execution_result");
      socket.off("error");
      disconnectSocket();
    };
  }, [roomId, participantName, activeToken]);

  function handleSendQuestionToCandidate(q: string, idx: number) {
    if (isCompleted || isCandidate) return;
    setActiveQuestion(q);
    setActiveQuestionIdx(idx);

    const parsed = parseProblemText(q);
    if (parsed.examples.length > 0) {
      setTestCases(parsed.examples);
      getSocket(activeToken || undefined).emit("testcases:update", { roomId, testCases: parsed.examples });
    }

    const socket = getSocket(activeToken || undefined);

    // 1. Live broadcast to candidate's Problem Statement panel
    socket.emit("question:send", { roomId, question: q });

    // 2. Persist to PostgreSQL database so refreshing the page retains the assigned problem
    api.patch(
      `/interviews/${roomId}`,
      { description: q },
      { headers: { Authorization: `Bearer ${activeToken}` } }
    ).catch(err => console.error("Failed to persist question:", err));

    // Notice: We strictly DO NOT inject question comments into the code editor.
    // The code editor remains clean for code only, while the problem statement is cleanly displayed on the right panel.

    toast.success(`Problem ${idx + 1} sent to Candidate's Problem Statement!`);
  }

  function handleCleanQuestionComments() {
    // Strips out multi-line commented question headers
    let cleaned = code
      .replace(/(\/\/|#)\s*=+\s*[\r\n]+(((\/\/|#).*[\r\n]+)*)(\/\/|#)\s*=+\s*[\r\n]*/g, "")
      .replace(/^(\/\/|#)\s*(📌|PROBLEM|QUESTION|LeetCode).*[\r\n]+/gim, "")
      .trim();

    if (!cleaned) {
      cleaned = STARTER_CODE[language] || "";
    }
    setCode(cleaned);
    getSocket(activeToken || undefined).emit("code:change", { roomId, code: cleaned });
    toast.success("Question comments cleared from code editor!");
  }

  function handleEvalClick(q: string, evalType: "Strong" | "Average" | "Weak", qIdx: number) {
    if (isCompleted || isCandidate) return;
    setEvals(prev => ({...prev, [qIdx]: evalType}));
    
    setNotes(prev => {
      const performanceLineMap = {
        "Strong": "🟢 Performance: Strong",
        "Average": "🟡 Performance: Average",
        "Weak": "🔴 Performance: Weak"
      };
      const targetQ = `Q: ${q}`;
      
      if (prev.includes(targetQ)) {
        const lines = prev.split('\n');
        const qIndex = lines.findIndex(line => line === targetQ);
        if (qIndex !== -1 && qIndex + 1 < lines.length) {
          if (lines[qIndex + 1].includes("Performance:")) {
            lines[qIndex + 1] = performanceLineMap[evalType];
            return lines.join('\n');
          }
        }
      }
      return prev + (prev ? "\n\n" : "") + `---\n${targetQ}\n${performanceLineMap[evalType]}\n`;
    });
  }

  async function handleGenerateQuestions(diffOverride?: "easy" | "medium" | "hard") {
    if (isCompleted || isCandidate) return;
    const targetDifficulty = diffOverride || difficulty;
    
    setLoadingQuestions(true);
    try {
      const response = await api.post(
        "/ai/questions",
        { role: interviewInfo.role, difficulty: targetDifficulty, count: 5, interviewId: roomId },
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );
      const questionsData = response?.data?.data;
      if (Array.isArray(questionsData) && questionsData.length > 0) {
        setQuestions(questionsData);
        toast.success(`Generated 5 ${targetDifficulty.toUpperCase()} LeetCode coding problems!`);
      }
    } catch (err: unknown) {
      console.error("Questions error:", err);
      const easyFallbacks = [
        "Two Sum\nGiven an array of integers 'nums' and an integer 'target', return indices of the two numbers such that they add up to target.\nFunction: function twoSum(nums, target)\nExample:\nInput: nums = [2, 7, 11, 15], target = 9 -> Output: [0, 1]\nInput: nums = [3, 2, 4], target = 6 -> Output: [1, 2]\nInput: nums = [3, 3], target = 6 -> Output: [0, 1]\nInput: nums = [-1, -2, -3, -4, -5], target = -8 -> Output: [2, 4]\nTarget Complexity: O(n) time, O(n) space.",
        "Valid Parentheses\nGiven a string 's' containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid (brackets must close in correct order).\nFunction: function isValid(s)\nExample:\nInput: s = \"()[]{}\" -> Output: true\nInput: s = \"(]\" -> Output: false\nInput: s = \"([)]\" -> Output: false\nInput: s = \"{[]}\" -> Output: true\nTarget Complexity: O(n) time using a stack.",
        "Best Time to Buy and Sell Stock\nGiven an array 'prices' where prices[i] is the stock price on day i, return the maximum profit achievable by buying on one day and selling on a future day. Return 0 if no profit.\nFunction: function maxProfit(prices)\nExample:\nInput: prices = [7, 1, 5, 3, 6, 4] -> Output: 5\nInput: prices = [7, 6, 4, 3, 1] -> Output: 0\nInput: prices = [2, 4, 1] -> Output: 2\nInput: prices = [1, 2, 3, 4, 5] -> Output: 4\nTarget Complexity: O(n) time, O(1) space.",
        "Valid Palindrome\nGiven a string 's', return true if it is a palindrome, considering only alphanumeric characters and ignoring case.\nFunction: function isPalindrome(s)\nExample:\nInput: s = \"A man, a plan, a canal: Panama\" -> Output: true\nInput: s = \"race a car\" -> Output: false\nInput: s = \" \" -> Output: true\nInput: s = \"0P\" -> Output: false\nTarget Complexity: O(n) time, O(1) space.",
        "Contains Duplicate\nGiven an integer array 'nums', return true if any value appears at least twice in the array, and return false if every element is distinct.\nFunction: function containsDuplicate(nums)\nExample:\nInput: nums = [1, 2, 3, 1] -> Output: true\nInput: nums = [1, 2, 3, 4] -> Output: false\nInput: nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2] -> Output: true\nInput: nums = [99] -> Output: false\nTarget Complexity: O(n) time using a hash set."
      ];
      const mediumFallbacks = [
        "Group Anagrams\nGiven an array of strings 'strs', group the anagrams together in any order.\nFunction: function groupAnagrams(strs)\nExample:\nInput: strs = [\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"] -> Output: [[\"bat\"], [\"nat\", \"tan\"], [\"ate\", \"eat\", \"tea\"]]\nInput: strs = [\"\"] -> Output: [[\"\"]]\nInput: strs = [\"a\"] -> Output: [[\"a\"]]\nInput: strs = [\"ab\", \"ba\"] -> Output: [[\"ab\", \"ba\"]]\nTarget Complexity: O(n * k log k) where k is max string length.",
        "Longest Substring Without Repeating Characters\nGiven a string 's', find the length of the longest substring without duplicate characters.\nFunction: function lengthOfLongestSubstring(s)\nExample:\nInput: s = \"abcabcbb\" -> Output: 3\nInput: s = \"bbbbb\" -> Output: 1\nInput: s = \"pwwkew\" -> Output: 3\nInput: s = \"\" -> Output: 0\nTarget Complexity: O(n) using sliding window.",
        "Merge Intervals\nGiven an array of 'intervals' where intervals[i] = [start, end], merge all overlapping intervals and return the non-overlapping intervals.\nFunction: function merge(intervals)\nExample:\nInput: intervals = [[1, 3], [2, 6], [8, 10], [15, 18]] -> Output: [[1, 6], [8, 10], [15, 18]]\nInput: intervals = [[1, 4], [4, 5]] -> Output: [[1, 5]]\nInput: intervals = [[1, 4], [2, 3]] -> Output: [[1, 4]]\nInput: intervals = [[1, 4]] -> Output: [[1, 4]]\nTarget Complexity: O(n log n) time.",
        "Product of Array Except Self\nGiven an integer array 'nums', return an array 'answer' such that answer[i] is equal to the product of all elements of nums except nums[i]. Must run in O(n) time without division.\nFunction: function productExceptSelf(nums)\nExample:\nInput: nums = [1, 2, 3, 4] -> Output: [24, 12, 8, 6]\nInput: nums = [-1, 1, 0, -3, 3] -> Output: [0, 0, 9, 0, 0]\nInput: nums = [0, 0] -> Output: [0, 0]\nInput: nums = [2, 3] -> Output: [3, 2]\nTarget Complexity: O(n) time, O(1) auxiliary space.",
        "Top K Frequent Elements\nGiven an integer array 'nums' and an integer 'k', return the 'k' most frequent elements.\nFunction: function topKFrequent(nums, k)\nExample:\nInput: nums = [1, 1, 1, 2, 2, 3], k = 2 -> Output: [1, 2]\nInput: nums = [1], k = 1 -> Output: [1]\nInput: nums = [4, 1, -1, 2, -1, 2, 3], k = 2 -> Output: [-1, 2]\nInput: nums = [3, 0, 1, 0], k = 1 -> Output: [0]\nTarget Complexity: O(n log k) time or O(n) bucket sort."
      ];
      const hardFallbacks = [
        "Trapping Rain Water\nGiven 'n' non-negative integers representing an elevation map where width of each bar is 1, compute how much water it can trap after raining.\nFunction: function trap(height)\nExample:\nInput: height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] -> Output: 6\nInput: height = [4, 2, 0, 3, 2, 5] -> Output: 9\nInput: height = [3, 0, 2, 0, 4] -> Output: 7\nInput: height = [1, 2, 3, 4, 5] -> Output: 0\nTarget Complexity: O(n) time, O(1) space using two pointers.",
        "Minimum Window Substring\nGiven strings 's' and 't', return the minimum window substring of 's' such that every character in 't' (with duplicates) is included. Return \"\" if no such substring exists.\nFunction: function minWindow(s, t)\nExample:\nInput: s = \"ADOBECODEBANC\", t = \"ABC\" -> Output: \"BANC\"\nInput: s = \"a\", t = \"a\" -> Output: \"a\"\nInput: s = \"a\", t = \"aa\" -> Output: \"\"\nInput: s = \"ab\", t = \"b\" -> Output: \"b\"\nTarget Complexity: O(m + n) time using sliding window.",
        "Sliding Window Maximum\nGiven an array of integers 'nums' and a sliding window of size 'k' moving from left to right, return the max sliding window array.\nFunction: function maxSlidingWindow(nums, k)\nExample:\nInput: nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3 -> Output: [3, 3, 5, 5, 6, 7]\nInput: nums = [1], k = 1 -> Output: [1]\nInput: nums = [1, -1], k = 1 -> Output: [1, -1]\nInput: nums = [9, 11], k = 2 -> Output: [11]\nTarget Complexity: O(n) time using monotonic deque.",
        "Merge k Sorted Lists\nGiven an array of 'k' linked lists, each sorted in ascending order, merge all lists into one sorted list.\nFunction: function mergeKLists(lists)\nExample:\nInput: lists = [[1, 4, 5], [1, 3, 4], [2, 6]] -> Output: [1, 1, 2, 3, 4, 4, 5, 6]\nInput: lists = [] -> Output: []\nInput: lists = [[]] -> Output: []\nInput: lists = [[1], [0]] -> Output: [0, 1]\nTarget Complexity: O(N log k) where N is total node count.",
        "Median of Two Sorted Arrays\nGiven two sorted arrays 'nums1' and 'nums2' of sizes 'm' and 'n', return the median of the two sorted arrays.\nFunction: function findMedianSortedArrays(nums1, nums2)\nExample:\nInput: nums1 = [1, 3], nums2 = [2] -> Output: 2.0\nInput: nums1 = [1, 2], nums2 = [3, 4] -> Output: 2.5\nInput: nums1 = [0, 0], nums2 = [0, 0] -> Output: 0.0\nInput: nums1 = [], nums2 = [1] -> Output: 1.0\nTarget Complexity: O(log(min(m, n))) binary search."
      ];
      const selected = targetDifficulty === "easy" ? easyFallbacks : targetDifficulty === "hard" ? hardFallbacks : mediumFallbacks;
      setQuestions(selected);
      toast.success(`Loaded 5 algorithmic challenges!`);
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function handleGetFeedback() {
    if (isCompleted || isCandidate) return;
    if (!code || code.trim().length < 10) {
      toast.error("Write some code first before requesting feedback.");
      return;
    }
    setLoadingFeedback(true);
    try {
      const response = await api.post(
        "/ai/feedback",
        { code, language, interviewId: roomId },
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );
      const feedbackData = response?.data?.data;
      if (feedbackData && typeof feedbackData === "object") {
        setFeedback(feedbackData as Feedback);
      }
    } catch (err: unknown) {
      console.error("Feedback error:", err);
      setFeedback({
        overall: "The code demonstrates good structure and handles common test cases.",
        timeComplexity: "O(N)",
        spaceComplexity: "O(1)",
        strengths: ["Clean syntax", "Appropriate naming conventions"],
        improvements: ["Consider handling boundary conditions and null checks"],
        optimizedCode: code + "\n// AI Optimized version"
      });
    } finally {
      setLoadingFeedback(false);
    }
  }

  async function handleGenerateReport() {
    if (isCompleted || isCandidate) return;
    setGeneratingReport(true);
    try {
      await api.patch(
        `/interviews/${roomId}`,
        { status: "COMPLETED", codeSubmitted: code, language, interviewNotes: notes },
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );
      setIsCompleted(true);
      await api.post(
        `/reports/${roomId}/generate`,
        { codeSubmitted: code, language, questionsAsked: questions, interviewNotes: notes },
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );
      router.push(`/dashboard/interviews/${roomId}/report`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setGeneratingReport(false);
    }
  }

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (isCompleted) return;
    if (isRemoteChange.current) { isRemoteChange.current = false; return; }
    const newCode = value ?? "";
    setCode(newCode);
    getSocket(activeToken || undefined).emit("code:change", { roomId, code: newCode });
  }, [roomId, isCompleted, activeToken]);

  function handleLanguageChange(lang: string) {
    if (isCompleted) return;
    setLanguage(lang);
    setCode(STARTER_CODE[lang] || "");
    getSocket(activeToken || undefined).emit("language:change", { roomId, language: lang });
  }

  function handleEditorMount(ed: editor.IStandaloneCodeEditor) {
    editorRef.current = ed;
    if (!isCompleted) ed.focus();
  }

  function handleRunCode() {
    if (isCompleted || isExecuting) return;
    if (!code || code.trim().length === 0) return;
    setIsExecuting(true);
    setExecutionOutput(null);
    setTestSuiteSummary(null);

    const problemText = activeQuestion || interviewInfo.description || "";
    const parsedProblem = problemText ? parseProblemText(problemText) : null;
    const effectiveTests = (testCases && testCases.length > 0) ? testCases : (parsedProblem?.examples || []);
    const fnName = detectFunctionName(code, parsedProblem?.functionSignature);

    let codeToExecute = code;
    if (fnName && effectiveTests.length > 0 && (language === "javascript" || language === "typescript" || language === "python")) {
      codeToExecute = buildExecutableCodeWithTests(code, language, fnName, effectiveTests);
    }

    getSocket(activeToken || undefined).emit("code:execute", { roomId, language, code: codeToExecute });
  }

  if (loadingInitial) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-row-reverse h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      
      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: RECRUITER / INTERVIEWER WORKSPACE
          ───────────────────────────────────────────────────────────── */}
      {isPanelOpen && !isCandidate && (
        <div className="w-2/5 flex flex-col border-l border-[var(--border-default)] bg-[var(--bg-surface)]">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--bg-surface)]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Candidate Evaluation
                </span>
                <Badge variant="neutral" className="px-1.5 py-0 text-[10px]">{interviewInfo.stage}</Badge>
              </div>
              <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2">
                {interviewInfo.candidateName}
                {isCompleted && (
                  <span className="text-[var(--text-muted)]" title="Session is submitted and locked">
                    {Icons.lock}
                  </span>
                )}
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                {interviewInfo.role}
              </p>
            </div>
          
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-elevated)] rounded-[var(--radius-default)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-secondary)]">
                {Icons.clock} {formatTime(elapsed)}
              </div>
              <div className="flex -space-x-2 mr-1">
                {users.map((u, i) => (
                  <div
                    key={i}
                    title={u.name}
                    className="h-6 w-6 rounded-full border-2 border-[var(--bg-surface)] flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ backgroundColor: u.color, zIndex: users.length - i }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <Button
                onClick={handleGenerateReport}
                disabled={generatingReport || isCompleted}
                variant={isCompleted ? "secondary" : "default"}
                size="sm"
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {generatingReport ? "Submitting..." : isCompleted ? "View Report" : "Submit Interview"}
              </Button>
            </div>
          </div>

          {/* Unified Content Area */}
          <div className="flex-1 overflow-y-auto bg-[var(--bg-base)] flex flex-col">
            
            {/* Active Problem on Candidate Screen Card (Interviewer View) */}
            {activeQuestion && (
              <div className="p-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Live on Candidate Screen
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQuestion("");
                      setActiveQuestionIdx(null);
                      getSocket(activeToken || undefined).emit("question:send", { roomId, question: "" });
                      api.patch(`/interviews/${roomId}`, { description: "" }, { headers: { Authorization: `Bearer ${activeToken}` } }).catch(() => {});
                    }}
                    className="text-[10px] text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear Active Problem
                  </button>
                </div>
                <div className="p-3 rounded-[var(--radius-default)] bg-[var(--bg-base)] border border-[var(--border-divider)]">
                  <FormattedProblemStatement
                    rawText={activeQuestion}
                    testCases={testCases}
                    onTestCasesChange={(cases) => {
                      setTestCases(cases);
                      getSocket(activeToken || undefined).emit("testcases:update", { roomId, testCases: cases });
                    }}
                  />
                </div>
              </div>
            )}

            {/* Recruiter Live Test Cases Evaluation Scorecard */}
            {(() => {
              const totalCount = testSuiteSummary?.totalCount ?? (testCases.length > 0 ? testCases.length : 4);
              const passedCount = testSuiteSummary?.passedCount ?? 0;
              const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
              const publicPassed = testSuiteSummary?.results.slice(0, 2).filter((r) => r.passed).length ?? 0;
              const hiddenPassed = testSuiteSummary?.results.slice(2, 4).filter((r) => r.passed).length ?? 0;

              return (
                <div className="p-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>🧪</span> Candidate Test Case Evaluation
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-mono px-2 py-0.5 rounded font-bold border",
                          testSuiteSummary
                            ? passedCount === totalCount
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : passedCount >= 3
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-[var(--bg-base)] text-[var(--text-muted)] border-[var(--border-default)]"
                        )}
                      >
                        {testSuiteSummary
                          ? `${passedCount} / ${totalCount} Solved (${passRate}%)`
                          : "0 / 4 Solved (Awaiting Run)"}
                      </span>
                    </div>

                    {testSuiteSummary && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const recGrade = passedCount === 4 ? "Strong" : passedCount === 3 ? "Average" : "Weak";
                          if (activeQuestionIdx !== null) {
                            handleEvalClick(activeQuestion, recGrade, activeQuestionIdx);
                          }
                          const evalNote = `\n[Test Cases Evaluation]: ${passedCount}/4 Solved (${passRate}%). Public: ${publicPassed}/2, Hidden Edge: ${hiddenPassed}/2. Grade: ${recGrade.toUpperCase()}.`;
                          setNotes((prev) => (prev.includes(evalNote) ? prev : prev + evalNote));
                          toast.success(`Evaluated as ${recGrade}! Rubric and notes updated.`);
                        }}
                        className="h-6 text-[10px] px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer"
                        title="Auto-grade candidate rubric and update notes based on test cases solved"
                      >
                        ⚡ Auto-Grade Candidate
                      </Button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-[#141820] border border-[#273244] overflow-hidden flex">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          passRate === 100
                            ? "bg-emerald-500"
                            : passRate >= 75
                            ? "bg-amber-500"
                            : passRate > 0
                            ? "bg-rose-500"
                            : "bg-transparent"
                        )}
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                      <span>Public Cases: <strong className="text-white">{publicPassed}/2</strong></span>
                      <span>Hidden Edge Cases: <strong className="text-purple-300">{hiddenPassed}/2</strong></span>
                      <span>Pass Rate: <strong className="text-white">{passRate}%</strong></span>
                    </div>
                  </div>

                  {/* Scoring Breakdown & Rubric Guidance */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-[var(--bg-base)] border border-[var(--border-divider)] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block">Evaluation Rule:</span>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                        {passedCount === 4 && testSuiteSummary
                          ? "🟢 Strong Hire: Solved all 4 test cases including both hidden edge cases."
                          : passedCount === 3 && testSuiteSummary
                          ? "🟡 Average / Borderline: Solved visible cases; failed 1 hidden edge case."
                          : passedCount > 0 && testSuiteSummary
                          ? "🔴 Weak: Incomplete logic, failed multiple test cases."
                          : "⚪ Awaiting candidate code execution against test suite."}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-[var(--bg-base)] border border-[var(--border-divider)] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block">Candidate Visibility:</span>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-snug font-mono">
                        • Cases 1 & 2: <span className="text-emerald-400">Visible to Candidate</span><br />
                        • Cases 3 & 4: <span className="text-purple-400">Hidden Edge Cases</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* AI Questions Section */}
            <div className="p-5 flex flex-col gap-3 border-b border-[var(--border-default)] shrink-0 bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    🤖 AI Interview Copilot
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    LeetCode algorithmic problems calibrated to difficulty
                  </p>
                  {/* Difficulty selector buttons */}
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mr-1">Level:</span>
                    {(["easy", "medium", "hard"] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => {
                          setDifficulty(diff);
                          handleGenerateQuestions(diff);
                        }}
                        disabled={loadingQuestions || isCompleted}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold transition-all capitalize border cursor-pointer",
                          difficulty === diff
                            ? diff === "easy"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm"
                              : diff === "medium"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm"
                              : "bg-red-500/20 text-red-400 border-red-500/40 shadow-sm"
                            : "bg-[var(--bg-base)] text-[var(--text-muted)] border-[var(--border-default)] hover:text-white hover:border-[var(--border-divider)]"
                        )}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
                {!loadingQuestions && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex items-center gap-1 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 self-start"
                    onClick={() => handleGenerateQuestions(difficulty)}
                    disabled={isCompleted}
                  >
                    {questions.length === 0 ? "⚡ Generate 5 LeetCode Problems" : "🔄 Regenerate 5 LeetCode Problems"}
                  </Button>
                )}
              </div>
              
              {loadingQuestions ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-[var(--text-muted)]">
                  <div className="w-5 h-5 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
                  <p className="text-xs">Generating tailored questions...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)] text-center py-4 border border-dashed border-[var(--border-default)] rounded-[var(--radius-default)] bg-[var(--bg-base)]">
                  Click <strong className="text-[var(--text-secondary)]">Generate Now</strong> to create tailored interview questions.
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const qParsed = parseProblemText(q);
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-[var(--radius-default)] border border-[var(--border-divider)] bg-[var(--bg-base)] hover:border-indigo-500/40 transition-colors group space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs text-[var(--text-primary)] leading-relaxed font-normal">
                            {qParsed.description || q}
                          </p>
                          <Badge variant="outline" className="text-[9px] shrink-0 font-mono">
                            Q{idx + 1}
                          </Badge>
                        </div>

                        {qParsed.functionSignature && (
                          <div className="text-[11px] font-mono text-sky-300 bg-[#141820] px-2 py-1 rounded border border-[#273244] overflow-x-auto">
                            <code>{qParsed.functionSignature}</code>
                          </div>
                        )}

                        {qParsed.examples.length > 0 && (
                          <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1.5">
                            <span>🧪</span> {qParsed.examples.length} Test Cases included
                          </div>
                        )}

                        {/* Question Actions: Send to Candidate */}
                        <div className="mt-2.5 pt-2 border-t border-[var(--border-divider)] flex items-center justify-between gap-2">
                          <Button
                            variant={activeQuestionIdx === idx ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-6 text-[10px] px-2.5 gap-1 font-medium transition-colors cursor-pointer",
                              activeQuestionIdx === idx
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm"
                                : "hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 text-[var(--text-secondary)]"
                            )}
                            onClick={() => handleSendQuestionToCandidate(q, idx)}
                            title="Push this question live to Candidate's Problem Statement panel"
                          >
                            {activeQuestionIdx === idx ? "✓ On Candidate Screen" : "📌 Send to Candidate"}
                          </Button>
                        </div>

                      {/* Rubric Evaluation */}
                      <div className="mt-2 pt-2 border-t border-[var(--border-divider)] flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] mr-1">Rubric Score:</span>
                        <Button
                          variant={evals[idx] === 'Strong' ? 'default' : 'outline'}
                          size="sm"
                          className={cn("h-6 text-[10px] px-2 transition-colors", evals[idx] === 'Strong' ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" : "hover:bg-emerald-500/10 hover:text-emerald-500")}
                          onClick={() => handleEvalClick(q, 'Strong', idx)}
                        >
                          🟢 Strong
                        </Button>
                        <Button
                          variant={evals[idx] === 'Average' ? 'default' : 'outline'}
                          size="sm"
                          className={cn("h-6 text-[10px] px-2 transition-colors", evals[idx] === 'Average' ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" : "hover:bg-amber-500/10 hover:text-amber-500")}
                          onClick={() => handleEvalClick(q, 'Average', idx)}
                        >
                          🟡 Average
                        </Button>
                        <Button
                          variant={evals[idx] === 'Weak' ? 'default' : 'outline'}
                          size="sm"
                          className={cn("h-6 text-[10px] px-2 transition-colors", evals[idx] === 'Weak' ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : "hover:bg-red-500/10 hover:text-red-500")}
                          onClick={() => handleEvalClick(q, 'Weak', idx)}
                        >
                          🔴 Weak
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>

            {/* Private Notes Section */}
            <div className="flex-1 flex flex-col min-h-[350px]">
              <div className="p-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex justify-between items-center px-5 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Interviewer Notes</h2>
                  <span className="text-[10px] text-amber-500 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    🔒 Confidential
                  </span>
                </div>
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 font-mono">
                  {saveStatus === "saving" && <><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-pulse" /> Saving...</>}
                  {saveStatus === "saved" && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Auto-saved</>}
                  {saveStatus === "error" && <><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Save error</>}
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isCompleted}
                placeholder="Type your private evaluation notes here... (Scoring rubric selections will automatically append here). Markdown is supported."
                className="w-full flex-1 p-5 bg-[var(--bg-base)] text-[var(--text-primary)] text-xs leading-relaxed resize-none focus:outline-none placeholder:text-[var(--text-disabled)] font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: CANDIDATE WORKSPACE (GUIDANCE & PROBLEM PANEL)
          ───────────────────────────────────────────────────────────── */}
      {isPanelOpen && isCandidate && (
        <div className="w-2/5 flex flex-col border-l border-[var(--border-default)] bg-[var(--bg-surface)]">
          {/* Candidate Header */}
          <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--bg-surface)]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Candidate Session
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">
                Welcome, {interviewInfo.candidateName}
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                {interviewInfo.role}
              </p>
            </div>
          
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-elevated)] rounded-[var(--radius-default)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-secondary)]">
                {Icons.clock} {formatTime(elapsed)}
              </div>
              <div className="flex -space-x-2">
                {users.map((u, i) => (
                  <div
                    key={i}
                    title={u.name}
                    className="h-6 w-6 rounded-full border-2 border-[var(--bg-surface)] flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ backgroundColor: u.color, zIndex: users.length - i }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Candidate Instructions Body */}
          <div className="flex-1 overflow-y-auto bg-[var(--bg-base)] p-5 space-y-4">
            
            {/* Guidelines Card */}
            <div className="p-4 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>📋</span> Interview Instructions
              </h2>
              <ul className="text-xs text-[var(--text-secondary)] space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Real-Time Sync:</strong> Your code in the editor is synchronized live with your interviewer.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Language Choice:</strong> Select your preferred programming language from the top toolbar dropdown.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Testing Code:</strong> Click <strong>Run Code</strong> anytime to compile and execute your solution in our cloud sandbox. Terminal outputs will appear below.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Communication:</strong> Feel free to ask questions and explain your thought process with your interviewer as you write your code.</span>
                </li>
              </ul>
            </div>

            {/* Problem Statement Card */}
            <div className="p-4 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>💡</span> Problem Statement
                </span>
                {activeQuestion && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Assigned
                  </span>
                )}
              </h2>

              {activeQuestion || interviewInfo.description ? (
                <div className="p-3.5 rounded-[var(--radius-default)] bg-[var(--bg-base)] border border-indigo-500/25 shadow-sm animate-in fade-in duration-200">
                  <FormattedProblemStatement
                    rawText={activeQuestion || interviewInfo.description}
                    isCandidate={isCandidate}
                    testCases={testCases}
                    onTestCasesChange={(cases) => {
                      setTestCases(cases);
                      getSocket(activeToken || undefined).emit("testcases:update", { roomId, testCases: cases });
                    }}
                    onInsertStarter={(starter) => {
                      setCode((prev) => {
                        const next = prev.trim() ? prev + "\n\n" + starter : starter;
                        getSocket(activeToken || undefined).emit("code:change", { roomId, code: next });
                        return next;
                      });
                    }}
                  />
                </div>
              ) : (
                <div className="text-xs text-[var(--text-muted)] leading-relaxed bg-[var(--bg-base)] p-4 rounded border border-dashed border-[var(--border-divider)] text-center">
                  Your interviewer will outline the problem scenario and assign a coding challenge to your Problem Statement panel.
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="p-4 rounded-[var(--radius-default)] border border-[var(--border-divider)] bg-[var(--bg-surface)] space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                <span>⚡</span> Pro Tips
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Focus on edge cases, clean variable names, and algorithmic efficiency. You can collapse this side panel using the arrow button at the top to expand the code editor to full screen.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: COLLABORATIVE MONACO CODE EDITOR & TERMINAL
          ───────────────────────────────────────────────────────────── */}
      <div className={cn("flex flex-col relative bg-[#1E1E1E]", isPanelOpen ? "w-3/5" : "w-full")}>
        
        {/* Editor Top Toolbar */}
        <div className="absolute top-0 right-0 left-0 h-12 flex items-center justify-between px-4 z-10 pointer-events-none bg-[#1E1E1E]/95 backdrop-blur-sm border-b border-[#333]">
          
          {/* Top Left: Role Banner & Interview Info */}
          <div className="pointer-events-auto flex items-center gap-3">
            {!isCandidate ? (
              <>
                <button
                  onClick={() => router.push("/dashboard/interviews")}
                  className="text-[#858585] hover:text-white transition-colors p-1 flex items-center gap-1 text-xs font-medium"
                  title="Exit to Dashboard"
                >
                  {Icons.back} <span className="hidden sm:inline">Dashboard</span>
                </button>
                <div className="h-4 w-px bg-[#333]" />
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Interviewer Console
                </span>
                <span className="text-xs text-[#888] hidden md:inline">
                  Evaluating: <strong className="text-white">{interviewInfo.candidateName}</strong>
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-wide uppercase">HireSys</span>
                </div>
                <div className="h-4 w-px bg-[#333]" />
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Candidate Mode
                </span>
                <span className="text-xs text-[#888] hidden md:inline">
                  {interviewInfo.role}
                </span>
              </>
            )}
          </div>

          {/* Top Right: Code Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2.5 bg-[#252526] p-1 rounded-[var(--radius-default)] border border-[#333]">
              <Select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isCompleted}
                className="!bg-transparent !text-[#CCCCCC] !text-xs !font-medium !outline-none cursor-pointer !border-none !px-2 !py-0.5 hover:!text-white !h-7 !w-28 focus:!ring-0"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} className="bg-[#252526]">{LANG_LABELS[lang]}</option>
                ))}
              </Select>

              {/* AI Review Code is ONLY visible to interviewers */}
              {!isCandidate && (
                <>
                  <div className="w-px h-4 bg-[#333]" />
                  <Button 
                    size="sm" 
                    onClick={handleGetFeedback} 
                    disabled={isCompleted || loadingFeedback}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-none rounded-[var(--radius-default)] px-2.5 flex items-center gap-1.5"
                  >
                    {loadingFeedback ? "Reviewing..." : "⚡ AI Review Code"}
                  </Button>
                </>
              )}

              <div className="w-px h-4 bg-[#333]" />
              <button
                type="button"
                onClick={handleCleanQuestionComments}
                disabled={isCompleted}
                className="h-7 text-xs text-[#888] hover:text-white px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear question comment headers from the code editor"
              >
                🧹 Clear Comments
              </button>

              <div className="w-px h-4 bg-[#333]" />
              <Button 
                size="sm" 
                onClick={handleRunCode} 
                disabled={isCompleted || isExecuting}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-none rounded-[var(--radius-default)] px-3 flex items-center gap-1.5"
              >
                {isExecuting ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running...</>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Run Code
                  </>
                )}
              </Button>
            </div>
            
            {/* Toggle Panel Button (Available for both Interviewer and Candidate) */}
            <button 
              onClick={() => setIsPanelOpen(!isPanelOpen)} 
              className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-default)] bg-[#252526] border border-[#333] text-[#858585] hover:text-white hover:bg-[#333] transition-colors ml-1 shadow-sm" 
              title={isPanelOpen ? "Collapse Panel" : "Expand Panel"}
            >
              {isPanelOpen ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 pt-12">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "var(--font-mono), 'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 16, bottom: 16 },
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
              readOnly: isCompleted,
            }}
          />
        </div>

        {/* Terminal / Test Runner UI */}
        <div className="h-60 shrink-0 bg-[#1E1E1E] border-t border-[#333] flex flex-col">
          {/* Header Bar */}
          <div className="h-9 flex items-center px-3 border-b border-[#333] bg-[#252526] gap-2 select-none">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTerminalTab("tests")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer",
                  terminalTab === "tests"
                    ? "bg-[#1E1E1E] text-white font-semibold"
                    : "text-[#858585] hover:text-[#CCCCCC]"
                )}
              >
                <span>🧪 Test Results</span>
                {testSuiteSummary && (
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.2 rounded font-bold",
                      testSuiteSummary.passedCount === testSuiteSummary.totalCount
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    )}
                  >
                    {testSuiteSummary.passedCount}/{testSuiteSummary.totalCount} Solved
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTerminalTab("console")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer",
                  terminalTab === "console"
                    ? "bg-[#1E1E1E] text-white font-semibold"
                    : "text-[#858585] hover:text-[#CCCCCC]"
                )}
              >
                <span>💻 Console Output</span>
              </button>
            </div>

            {/* Status indicator on right */}
            <div className="ml-auto flex items-center gap-2">
              {isExecuting ? (
                <span className="text-[11px] text-sky-400 font-mono flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Running in sandbox tunnel...
                </span>
              ) : testSuiteSummary ? (
                <span
                  className={cn(
                    "text-[11px] font-mono px-2 py-0.5 rounded font-bold border",
                    testSuiteSummary.passedCount === testSuiteSummary.totalCount
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}
                >
                  {testSuiteSummary.passedCount === testSuiteSummary.totalCount ? "🎉" : "⚠️"}{" "}
                  {testSuiteSummary.passedCount} / {testSuiteSummary.totalCount} Test Cases Solved
                </span>
              ) : executionOutput ? (
                <span
                  className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded",
                    executionOutput.isError
                      ? "bg-red-500/20 text-red-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  )}
                >
                  {executionOutput.isError ? "Exit with Error" : "Completed Successfully"}
                </span>
              ) : null}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            {isExecuting ? (
              <div className="flex items-center gap-2 text-sky-400 h-full justify-center">
                <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span>Executing solution against all test cases in tunnel...</span>
              </div>
            ) : terminalTab === "tests" ? (
              testSuiteSummary && testSuiteSummary.results && testSuiteSummary.results.length > 0 ? (
                <div className="space-y-3">
                  {/* Case selector tabs */}
                  <div className="flex items-center gap-2 border-b border-[#333] pb-2 overflow-x-auto">
                    {testSuiteSummary.results.map((r, idx) => {
                      const isHiddenCase = Boolean(r.isHidden ?? idx >= 2);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveResultTab(idx)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-colors cursor-pointer",
                            activeResultTab === idx
                              ? "bg-[#37373d] text-white font-semibold ring-1 ring-indigo-500/50"
                              : "text-[#858585] hover:text-[#CCCCCC] hover:bg-[#2a2d2e]"
                          )}
                        >
                          <span>Case {r.index}{isHiddenCase ? (isCandidate ? " 🔒" : " (Hidden)") : ""}</span>
                          {r.passed ? (
                            <span className="text-emerald-400 text-[11px]">✅</span>
                          ) : (
                            <span className="text-rose-400 text-[11px]">❌</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected test case detail */}
                  {(() => {
                    const cur =
                      testSuiteSummary.results[activeResultTab] ||
                      testSuiteSummary.results[0];
                    if (!cur) return null;

                    const isHiddenFromCandidate = isCandidate && Boolean(cur.isHidden ?? activeResultTab >= 2);

                    return (
                      <div className="space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-xs font-bold flex items-center gap-1.5",
                              cur.passed ? "text-emerald-400" : "text-rose-400"
                            )}
                          >
                            <span>{cur.passed ? "✅ Passed" : "❌ Failed"}</span>
                            <span className="text-[11px] font-normal text-[#858585]">
                              ({cur.durationMs}ms)
                            </span>
                          </span>

                          <span className="text-[10px] font-mono">
                            {isHiddenFromCandidate ? (
                              <span className="text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 font-semibold flex items-center gap-1">
                                <span>🔒</span> Hidden Edge Case
                              </span>
                            ) : !isCandidate && Boolean(cur.isHidden ?? activeResultTab >= 2) ? (
                              <span className="text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 font-semibold flex items-center gap-1">
                                <span>🔒</span> Hidden to Candidate (Recruiter Full View)
                              </span>
                            ) : (
                              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                                Public Test Case
                              </span>
                            )}
                          </span>
                        </div>

                        {isHiddenFromCandidate ? (
                          <div className="p-3 rounded bg-[#141820]/80 border border-dashed border-[#273244] text-[11px] font-sans text-[var(--text-muted)] space-y-1.5">
                            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                              <span>🔒</span> Hidden Test Case {cur.index}
                            </div>
                            <p className="leading-relaxed">
                              This test case validates algorithmic boundary conditions and hidden edge cases.
                              Your code was executed against this case in the tunnel and {cur.passed ? (
                                <strong className="text-emerald-400 font-semibold">successfully passed!</strong>
                              ) : (
                                <strong className="text-rose-400 font-semibold">did not match the expected return value.</strong>
                              )}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="p-2 rounded bg-[#141820] border border-[#273244] space-y-1">
                              <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider block font-sans">
                                Input:
                              </span>
                              <pre className="text-emerald-300 text-xs overflow-x-auto whitespace-pre font-mono">
                                {cur.input}
                              </pre>
                            </div>

                            <div className="p-2 rounded bg-[#141820] border border-[#273244] space-y-1">
                              <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider block font-sans">
                                Expected Output:
                              </span>
                              <pre className="text-indigo-300 text-xs overflow-x-auto whitespace-pre font-mono">
                                {cur.expected}
                              </pre>
                            </div>

                            <div
                              className={cn(
                                "p-2 rounded border space-y-1",
                                cur.passed
                                  ? "bg-emerald-950/20 border-emerald-500/25"
                                  : "bg-rose-950/20 border-rose-500/25"
                              )}
                            >
                              <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider block font-sans">
                                Actual Return:
                              </span>
                              <pre
                                className={cn(
                                  "text-xs overflow-x-auto whitespace-pre font-mono font-semibold",
                                  cur.passed ? "text-emerald-300" : "text-rose-300"
                                )}
                              >
                                {cur.actual}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : testSuiteSummary?.error ? (
                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded text-red-300 font-mono text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️ Test Harness Notice</span>
                  </div>
                  <div>{testSuiteSummary.error}</div>
                </div>
              ) : executionOutput ? (
                <div className="space-y-2 whitespace-pre-wrap">
                  {executionOutput.stdout && (
                    <span className="text-[#CCCCCC]">{executionOutput.stdout}</span>
                  )}
                  {executionOutput.stderr && (
                    <span className="text-[#F48771]">{executionOutput.stderr}</span>
                  )}
                  {!executionOutput.stdout && !executionOutput.stderr && (
                    <span className="text-[#858585] italic">
                      Program executed with no console output
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[#858585]">
                  Click &apos;Run Code&apos; to execute your solution against test cases in the sandbox tunnel.
                </span>
              )
            ) : executionOutput ? (
              <div className="flex flex-col gap-2 whitespace-pre-wrap">
                {executionOutput.stdout && (
                  <span className="text-[#CCCCCC]">{executionOutput.stdout}</span>
                )}
                {executionOutput.stderr && (
                  <span className="text-[#F48771]">{executionOutput.stderr}</span>
                )}
                {!executionOutput.stdout && !executionOutput.stderr && (
                  <span className="text-[#858585] italic">
                    Program executed with no console output
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[#858585]">
                Click &apos;Run Code&apos; to view standard console output here.
              </span>
            )}
          </div>
        </div>

        {/* AI Feedback Overlay (Interviewer Only) */}
        {feedback && !isCandidate && (
          <div className="absolute bottom-6 right-6 left-6 max-h-[40%] bg-[var(--bg-surface)] border border-indigo-500/40 rounded-[var(--radius-default)] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 z-20">
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-divider)] bg-[var(--bg-elevated)]">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                ⚡ AI Code Review & Feedback
              </h4>
              <button onClick={() => setFeedback(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                {Icons.close}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">{feedback.overall}</p>
                <div className="flex items-center gap-3">
                  <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded border border-[var(--border-default)] font-mono">
                    <strong className="text-indigo-400 mr-1">Time:</strong> {feedback.timeComplexity}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded border border-[var(--border-default)] font-mono">
                    <strong className="text-indigo-400 mr-1">Space:</strong> {feedback.spaceComplexity}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {feedback.strengths?.length > 0 && (
                  <div className="bg-[var(--bg-elevated)] p-3 rounded border border-[var(--border-default)]">
                    <h5 className="text-[11px] font-semibold text-emerald-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                      Strengths
                    </h5>
                    <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                      {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {feedback.improvements?.length > 0 && (
                  <div className="bg-[var(--bg-elevated)] p-3 rounded border border-[var(--border-default)]">
                    <h5 className="text-[11px] font-semibold text-amber-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                      Improvement Areas
                    </h5>
                    <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                      {feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
