"use client";
import { use, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGES = ["javascript", "typescript", "python", "java", "cpp", "go"];

const STARTER_CODE: Record<string, string> = {
  javascript: "// Write your solution here\nfunction solution() {\n  \n}\n",
  typescript:
    "// Write your solution here\nfunction solution(): void {\n  \n}\n",
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

  // Editor state
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_CODE["javascript"]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [connected, setConnected] = useState(false);

  // AI state — must be INSIDE the component
  const [questions, setQuestions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showPanel, setShowPanel] = useState<"questions" | "feedback" | null>(
    null,
  );
  const [questionsError, setQuestionsError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const isRemoteChange = useRef(false);

  // Socket setup
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("room:join", {
        roomId,
        userId: user.id,
        name: user.name,
      });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("code:update", ({ code: remoteCode }: { code: string }) => {
      isRemoteChange.current = true;
      setCode(remoteCode);
    });

    socket.on(
      "language:update",
      ({ language: remoteLang }: { language: string }) => {
        setLanguage(remoteLang);
        setCode(STARTER_CODE[remoteLang] || "");
      },
    );

    socket.on("room:users", (roomUsers: RoomUser[]) => {
      setUsers(roomUsers);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("code:update");
      socket.off("language:update");
      socket.off("room:users");
      disconnectSocket();
    };
  }, [roomId, user]);

  async function handleGenerateQuestions() {
    setQuestionsError("");
    setQuestions([]);
    setShowPanel("questions");
    setLoadingQuestions(true);

    try {
      const response = await api.post("/ai/questions", {
        role: "Frontend Engineer",
        difficulty: "medium",
      });

      const questionsData = response?.data?.data;

      if (Array.isArray(questionsData) && questionsData.length > 0) {
        setQuestions(questionsData);
      } else {
        setQuestionsError("No questions returned. Try again.");
      }
    } catch (err: unknown) {
      console.error("Questions error:", err);
      setQuestionsError("Failed to generate questions. Check API quota.");
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function handleGetFeedback() {
    if (!code || code.trim().length < 10) {
      setFeedbackError("Write some code first before requesting feedback.");
      setShowPanel("feedback");
      return;
    }

    setFeedbackError("");
    setFeedback(null);
    setShowPanel("feedback");
    setLoadingFeedback(true);

    try {
      const response = await api.post("/ai/feedback", {
        code,
        language,
      });

      const feedbackData = response?.data?.data;

      if (feedbackData && typeof feedbackData === "object") {
        setFeedback(feedbackData as Feedback);
      } else {
        setFeedbackError("Invalid response from AI. Try again.");
      }
    } catch (err: unknown) {
      console.error("Feedback error:", err);
      setFeedbackError("Failed to get feedback. Check API quota.");
    } finally {
      setLoadingFeedback(false);
    }
  }

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (isRemoteChange.current) {
        isRemoteChange.current = false;
        return;
      }
      const newCode = value ?? "";
      setCode(newCode);
      getSocket().emit("code:change", { roomId, code: newCode });
    },
    [roomId],
  );

  function handleLanguageChange(lang: string) {
    setLanguage(lang);
    setCode(STARTER_CODE[lang] || "");
    getSocket().emit("language:change", { roomId, language: lang });
  }

  function handleEditorMount(ed: editor.IStandaloneCodeEditor) {
    editorRef.current = ed;
    ed.focus();
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">
            Room: {roomId.slice(0, 8)}...
          </span>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${connected ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}
          >
            {connected ? "connected" : "disconnected"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateQuestions}
            className="px-3 py-1 text-xs bg-purple-700 hover:bg-purple-600 rounded"
          >
            AI Questions
          </button>
          <button
            onClick={handleGetFeedback}
            className="px-3 py-1 text-xs bg-blue-700 hover:bg-blue-600 rounded"
          >
            AI Feedback
          </button>
          {users.map((u, index) => (
            <div
              key={`${u.userId}-${index}`}
              title={u.name}
              style={{ backgroundColor: u.color }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
            >
              {u.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Main area — editor + panel side by side */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Side panel — shown FIRST so it doesn't push editor */}
        {showPanel && (
          <div className="w-80 shrink-0 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 shrink-0">
              <span className="text-sm font-medium text-white">
                {showPanel === "questions"
                  ? "📋 Interview Questions"
                  : "🔍 AI Code Review"}
              </span>
              <button
                onClick={() => setShowPanel(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Questions panel */}
              {showPanel === "questions" && (
                <div>
                  {loadingQuestions ? (
                    <div className="flex flex-col items-center gap-3 pt-8">
                      <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm">
                        Generating questions...
                      </p>
                    </div>
                  ) : questionsError ? (
                    <p className="text-red-400 text-sm">{questionsError}</p>
                  ) : questions.length === 0 ? (
                    <p className="text-gray-400 text-sm">No questions yet.</p>
                  ) : (
                    <ol className="space-y-3">
                      {questions.map((q, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-200 bg-gray-700 rounded-lg p-3"
                        >
                          <span className="text-purple-400 font-bold mr-2">
                            {i + 1}.
                          </span>
                          {q}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {/* Feedback panel */}
              {showPanel === "feedback" && (
                <div className="space-y-3">
                  {loadingFeedback ? (
                    <div className="flex flex-col items-center gap-3 pt-8">
                      <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm">
                        Analyzing your code...
                      </p>
                    </div>
                  ) : feedbackError ? (
                    <p className="text-red-400 text-sm">{feedbackError}</p>
                  ) : !feedback ? (
                    <p className="text-gray-400 text-sm">
                      Write some code then click AI Feedback.
                    </p>
                  ) : (
                    <>
                      <div className="bg-gray-700 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Overall</p>
                        <p className="text-sm text-gray-200">
                          {feedback.overall}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Time</p>
                          <p className="text-xs text-green-400">
                            {feedback.timeComplexity}
                          </p>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Space</p>
                          <p className="text-xs text-blue-400">
                            {feedback.spaceComplexity}
                          </p>
                        </div>
                      </div>
                      {feedback.strengths?.length > 0 && (
                        <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-2">
                            Strengths
                          </p>
                          {feedback.strengths.map((s, i) => (
                            <p key={i} className="text-xs text-green-300 mb-1">
                              ✓ {s}
                            </p>
                          ))}
                        </div>
                      )}
                      {feedback.improvements?.length > 0 && (
                        <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-2">
                            Improvements
                          </p>
                          {feedback.improvements.map((s, i) => (
                            <p key={i} className="text-xs text-yellow-300 mb-1">
                              → {s}
                            </p>
                          ))}
                        </div>
                      )}
                      {feedback.optimizedCode && (
                        <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-2">
                            Optimized Code
                          </p>
                          <pre className="text-xs text-gray-200 overflow-x-auto whitespace-pre-wrap">
                            {feedback.optimizedCode}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor — takes remaining space */}
        <div className="flex-1 min-w-0">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: "on",
              automaticLayout: true,
              lineNumbers: "on",
              renderLineHighlight: "all",
            }}
          />
        </div>
      </div>
    </div>
  );
}
