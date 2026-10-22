import fs from "fs";
import path from "path";

const RESUMES_DIR = path.resolve(process.cwd(), "uploads", "resumes");

/**
 * Ensures the uploads/resumes directory exists.
 */
function ensureDir() {
  if (!fs.existsSync(RESUMES_DIR)) {
    fs.mkdirSync(RESUMES_DIR, { recursive: true });
  }
}

/**
 * Saves a candidate's uploaded PDF resume file to disk and returns its API download/view URL.
 */
export function saveCandidateResume(candidateId: string, fileBuffer: Buffer): string {
  ensureDir();
  const filePath = path.join(RESUMES_DIR, `${candidateId}.pdf`);
  fs.writeFileSync(filePath, fileBuffer);
  return `/api/candidates/${candidateId}/resume/file`;
}

/**
 * Returns the absolute path of a candidate's stored resume PDF if it exists, or null.
 */
export function getCandidateResumePath(candidateId: string): string | null {
  const filePath = path.join(RESUMES_DIR, `${candidateId}.pdf`);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
