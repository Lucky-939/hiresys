"use client";
import { useState, useRef } from "react";
import { api } from "@/lib/api";

interface ResumeResult {
  score: number;
  atsScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingKeywords: string[];
}

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    setStatusMessage("Uploading resume...");

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const { data } = await api.post("/ai/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const jobId: string = data.jobId;
      setStatusMessage("AI is analyzing your resume in the background...");

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get(`/ai/resume/status/${jobId}`);
          const { status, data: resultData, error: jobError } = statusRes.data;

          if (status === "completed") {
            clearInterval(pollRef.current!);
            setResult(resultData as ResumeResult);
            setLoading(false);
            setStatusMessage("");
          } else if (status === "failed") {
            clearInterval(pollRef.current!);
            setError(jobError || "Analysis failed. Please try again.");
            setLoading(false);
            setStatusMessage("");
          }
        } catch {
          clearInterval(pollRef.current!);
          setError("Failed to check status.");
          setLoading(false);
          setStatusMessage("");
        }
      }, 2000);

      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          setError("Analysis timed out. Please try again.");
          setLoading(false);
          setStatusMessage("");
        }
      }, 120000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Upload failed");
      setLoading(false);
      setStatusMessage("");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">
        Resume Analyzer
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload your resume PDF and get instant AI feedback on strengths,
        improvements, and ATS compatibility.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Analyzing..." : "Analyze Resume"}
          </button>
        </div>

        {statusMessage && (
          <div className="mt-3 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-600">{statusMessage}</p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-1">Overall Score</p>
              <p className="text-3xl font-semibold text-gray-900">
                {result.score}
                <span className="text-lg text-gray-400">/100</span>
              </p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-1">ATS Score</p>
              <p className="text-3xl font-semibold text-gray-900">
                {result.atsScore}
                <span className="text-lg text-gray-400">/100</span>
              </p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${result.atsScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Summary</h2>
            <p className="text-sm text-gray-600">{result.summary}</p>
          </div>

          {result.strengths?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">
                Strengths
              </h2>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm text-green-700 flex items-start gap-2"
                  >
                    <span className="font-bold">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.weaknesses?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">
                Weaknesses
              </h2>
              <ul className="space-y-2">
                {result.weaknesses.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm text-red-600 flex items-start gap-2"
                  >
                    <span className="font-bold">✗</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestions?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">
                Suggestions
              </h2>
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm text-blue-700 flex items-start gap-2"
                  >
                    <span>→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.missingKeywords?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">
                Missing Keywords
              </h2>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.map((k, i) => (
                  <span
                    key={i}
                    className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full border border-red-200"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
