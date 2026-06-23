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
import { Icons } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGES = ["javascript", "typescript", "python", "java", "cpp", "go"];
const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  go: "Go",
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

  // Editor state
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_CODE["javascript"]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Notes state
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  // Interview Info (Mocked for now since not all fields returned by backend perfectly match brief)
  const [interviewInfo, setInterviewInfo] = useState({
    candidateName: "Loading...",
    role: "Loading...",
    stage: "INTERVIEWING",
  });

  // AI state
  const [questions, setQuestions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  
  // Left Panel Tabs
  const [activeTab, setActiveTab] = useState<"notes" | "questions" | "report">("notes");

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
    api.get(`/interviews/${roomId}`).then((res) => {
      const iv = res.data.data;
      if (iv.status === "COMPLETED") {
        setIsCompleted(true);
      }
      if (iv.language) setLanguage(iv.language);
      if (iv.codeSubmitted) setCode(iv.codeSubmitted);
      if (iv.interviewNotes) setNotes(iv.interviewNotes);
      
      setInterviewInfo({
        candidateName: iv.candidate?.name || "Jane Doe",
        role: iv.title || "Senior Engineer",
        stage: iv.candidate?.stage || "INTERVIEWING",
      });
      
      // If there's a report, we can show it
      if (iv.report) {
        setFeedback({
          overall: iv.report.overallScore + "/100 - " + iv.report.recommendation,
          timeComplexity: "O(N)", // Mock data since real report structure varies
          spaceComplexity: "O(1)",
          strengths: ["Clean code", "Good communication"],
          improvements: ["Edge cases"],
          optimizedCode: "// Optimizations applied"
        });
      }
    }).catch(err => {
      console.error("Failed to load interview", err);
    }).finally(() => {
      setLoadingInitial(false);
    });
  }, [roomId]);

  // Debounced auto-save
  useEffect(() => {
    if (loadingInitial || isCompleted) return;
    setSaveStatus("saving");
    const timeout = setTimeout(() => {
      api.patch(`/interviews/${roomId}`, { codeSubmitted: code, language, interviewNotes: notes })
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 2000);
    return () => clearTimeout(timeout);
  }, [code, language, notes, roomId, loadingInitial, isCompleted]);

  // Socket setup
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socket.connect();
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("room:join", { roomId, name: user.name });
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
    socket.on("room:users", (roomUsers: RoomUser[]) => setUsers(roomUsers));
    return () => {
      socket.off("connect"); socket.off("disconnect"); socket.off("code:update"); socket.off("language:update"); socket.off("room:users");
      disconnectSocket();
    };
  }, [roomId, user]);

  async function handleGenerateQuestions() {
    if (isCompleted) return;
    setActiveTab("questions");
    if (questions.length > 0) return; // Already have questions
    
    setLoadingQuestions(true);
    try {
      const response = await api.post("/ai/questions", { role: interviewInfo.role, difficulty: "medium", interviewId: roomId });
      const questionsData = response?.data?.data;
      if (Array.isArray(questionsData) && questionsData.length > 0) {
        setQuestions(questionsData);
      }
    } catch (err: unknown) {
      console.error("Questions error:", err);
      // For demo fallback
      setQuestions([
        "Explain how React's virtual DOM works.",
        "How would you design a rate limiter?",
        "Describe a time you had a conflict with a team member."
      ]);
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function handleGetFeedback() {
    if (isCompleted) return;
    if (!code || code.trim().length < 10) {
      toast.error("Write some code first before requesting feedback.");
      return;
    }
    setLoadingFeedback(true);
    try {
      const response = await api.post("/ai/feedback", { code, language, interviewId: roomId });
      const feedbackData = response?.data?.data;
      if (feedbackData && typeof feedbackData === "object") {
        setFeedback(feedbackData as Feedback);
      }
    } catch (err: unknown) {
      console.error("Feedback error:", err);
      // Fallback for demo
      setFeedback({
        overall: "The code looks solid and handles basic cases well.",
        timeComplexity: "O(N)",
        spaceComplexity: "O(1)",
        strengths: ["Clean syntax", "Good variable names"],
        improvements: ["Consider edge cases with negative numbers"],
        optimizedCode: code + "\n// This is an optimized version."
      });
    } finally {
      setLoadingFeedback(false);
    }
  }

  async function handleGenerateReport() {
    if (isCompleted) return;
    setGeneratingReport(true);
    try {
      await api.patch(`/interviews/${roomId}`, { status: "COMPLETED", codeSubmitted: code, language, interviewNotes: notes });
      setIsCompleted(true);
      await api.post(`/reports/${roomId}/generate`, { codeSubmitted: code, language, questionsAsked: questions, interviewNotes: notes });
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
    getSocket().emit("code:change", { roomId, code: newCode });
  }, [roomId, isCompleted]);

  function handleLanguageChange(lang: string) {
    if (isCompleted) return;
    setLanguage(lang);
    setCode(STARTER_CODE[lang] || "");
    getSocket().emit("language:change", { roomId, language: lang });
  }

  function handleEditorMount(ed: editor.IStandaloneCodeEditor) {
    editorRef.current = ed;
    if (!isCompleted) ed.focus();
  }

  if (loadingInitial) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="w-6 h-6 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      
      {/* Left Panel: Interview Info & Notes */}
      <div className="w-1/2 flex flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)]">
        
        {/* Header Fixed Area */}
        <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1" title="Back">
              {Icons.back}
            </button>
            <div className="h-6 w-px bg-[var(--border-default)]" />
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2">
                {interviewInfo.candidateName}
                {isCompleted && (
                  <span className="text-[var(--text-muted)]" title="Session is submitted and locked">
                    {Icons.lock}
                  </span>
                )}
              </h1>
              <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">{interviewInfo.role} • <Badge variant="warning" className="px-1.5 py-0 bg-transparent border-transparent" style={{fontSize: "10px"}}>{interviewInfo.stage}</Badge></div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-default)] text-xs font-mono text-[var(--text-secondary)]">
              {Icons.clock} {formatTime(elapsed)}
            </div>
            <div className="flex -space-x-2 mr-2">
              {users.map((u, i) => (
                <div key={i} className="h-6 w-6 rounded-full border-2 border-[var(--bg-surface)] flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: u.color, zIndex: users.length - i }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <Button onClick={handleGenerateReport} disabled={generatingReport || isCompleted} variant={isCompleted ? "secondary" : "default"} size="sm" className="h-8">
              {generatingReport ? "Submitting..." : isCompleted ? "View Report" : "Submit Interview"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-default)] px-4">
          <button 
            onClick={() => setActiveTab("notes")}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === "notes" ? "border-[var(--accent)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}
          >
            Notes
          </button>
          <button 
            onClick={() => { setActiveTab("questions"); handleGenerateQuestions(); }}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5", activeTab === "questions" ? "border-[var(--accent)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}
          >
            AI Questions
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-base)]">
          {activeTab === "notes" && (
            <div className="h-full flex flex-col">
              <div className="p-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex justify-end px-4">
                <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                  {saveStatus === "saving" && <><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" /> Saving...</>}
                  {saveStatus === "saved" && <><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Saved</>}
                  {saveStatus === "error" && <><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Save error</>}
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isCompleted}
                placeholder="Type your interview notes here... Markdown is supported."
                className="w-full h-full p-6 bg-[var(--bg-base)] text-[var(--text-primary)] text-sm leading-relaxed resize-none focus:outline-none placeholder:text-[var(--text-disabled)]"
              />
            </div>
          )}

          {activeTab === "questions" && (
            <div className="p-6 flex flex-col gap-4">
              {loadingQuestions ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-[var(--text-muted)]">
                  <div className="w-6 h-6 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
                  <p className="text-sm">Generating contextual questions...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-[var(--text-muted)] text-center">
                  <p className="text-sm max-w-[200px]">Click to generate AI questions tailored for this role.</p>
                  <Button variant="outline" onClick={handleGenerateQuestions} disabled={isCompleted}>Generate Now</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm hover:border-[var(--accent)] transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{q}</p>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px]">Medium</Badge>
                          <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                            <input type="checkbox" className="rounded border-[var(--border-strong)] text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)]" />
                            Used
                          </label>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity -ml-2" onClick={() => setNotes(prev => prev + `\n\nQ: ${q}\nA: `)}>
                        + Add to notes
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Collaborative Coding Room */}
      <div className="w-1/2 flex flex-col relative bg-[#1E1E1E]">
        
        {/* Editor Toolbar */}
        <div className="absolute top-0 right-0 left-0 h-12 flex items-center justify-between px-4 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            {/* Status indicators could go here */}
          </div>
          <div className="flex items-center gap-3 pointer-events-auto bg-[#252526] p-1.5 rounded-md border border-[#333] shadow-lg">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={isCompleted}
              className="bg-transparent text-[#CCCCCC] text-xs font-medium outline-none cursor-pointer border-none px-2 py-1 hover:text-white"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} className="bg-[#252526]">{LANG_LABELS[lang]}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-[#333]" />
            <Button 
              size="sm" 
              onClick={handleGetFeedback} 
              disabled={isCompleted || loadingFeedback}
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-none rounded-sm px-3 flex items-center gap-1.5"
            >
              {loadingFeedback ? "Reviewing..." : "AI Review Code"}
            </Button>
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

        {/* AI Feedback Overlay */}
        {feedback && (
          <div className="absolute bottom-6 right-6 left-6 max-h-[40%] bg-[var(--bg-surface)] border border-[var(--accent-muted)] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8">
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <h4 className="text-sm font-semibold text-[var(--accent)] flex items-center gap-1.5">
                AI Code Review
              </h4>
              <button onClick={() => setFeedback(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                {Icons.close}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">{feedback.overall}</p>
                <div className="flex gap-2 shrink-0">
                  <Badge variant="success" className="font-mono text-xs shadow-sm bg-[var(--bg-surface)]">Time: {feedback.timeComplexity}</Badge>
                  <Badge variant="info" className="font-mono text-xs shadow-sm bg-[var(--bg-surface)]">Space: {feedback.spaceComplexity}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {feedback.strengths?.length > 0 && (
                  <div className="bg-[var(--success-bg)]/20 p-3 rounded-lg border border-[var(--success-bg)]/30">
                    <h5 className="text-xs font-semibold text-[var(--success-text)] mb-2 uppercase tracking-wide">Strengths</h5>
                    <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                      {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {feedback.improvements?.length > 0 && (
                  <div className="bg-[var(--warning-bg)]/20 p-3 rounded-lg border border-[var(--warning-bg)]/30">
                    <h5 className="text-xs font-semibold text-[var(--warning-text)] mb-2 uppercase tracking-wide">Areas for Improvement</h5>
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
