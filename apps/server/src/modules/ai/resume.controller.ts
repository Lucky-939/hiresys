import { prisma } from "../../config/database";
import { assertTeamMember } from "../../utils/rbac";
import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { AppError } from "../../utils/errors";
import { getCache, setCache } from "../../config/cache";
import { resumeQueue } from "../../queues/resume.queue";
import multer from "multer";
import { randomUUID } from "crypto";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Magic number validation for PDF (%PDF-)
    if (buffer.length < 5 || buffer.toString('utf8', 0, 5) !== '%PDF-') {
      throw new AppError("Invalid file signature. Only actual PDF files are allowed.", 400);
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str || "")
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (err) {
    console.error("PDF extraction error:", err);
    throw new AppError(
      "Failed to read PDF file. Please try a different PDF.",
      400,
    );
  }
}

export async function analyzeResume(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError("Unauthorized", 401);

    if (!req.file) throw new AppError("No PDF file uploaded", 400);

    const candidateId = req.body.candidateId;
    let organizationId: string | undefined;

    if (candidateId) {
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { id: true, organizationId: true },
      });
      if (!candidate) throw new AppError("Candidate not found", 404);
      
      // Verify caller is a team member of candidate's organization (assertTeamMember blocks CANDIDATE role with 403)
      await assertTeamMember(candidate.organizationId, userId);
      organizationId = candidate.organizationId;
    } else {
      const orgId = (req.headers["x-organization-id"] as string) || req.body.organizationId;
      if (!orgId) {
        throw new AppError("Organization ID is required", 400);
      }
      await assertTeamMember(orgId, userId);
      organizationId = orgId;
    }

    const resumeText = await extractTextFromPDF(req.file.buffer);

    if (!resumeText || resumeText.trim().length < 50) {
      throw new AppError(
        "Could not extract text from PDF. Make sure it has selectable text and is not a scanned image.",
        400,
      );
    }

    if (candidateId) {
      const { saveCandidateResume } = require("../../utils/file-storage");
      const resumeUrl = saveCandidateResume(candidateId, req.file.buffer);
      const { prisma } = require("../../config/database");
      await prisma.candidate.update({
        where: { id: candidateId },
        data: { resumeUrl, resumeText },
      });
    }

    const jobId = randomUUID();

    await setCache(`resume-result:${jobId}`, { status: "processing", organizationId }, 3600);
    await resumeQueue.add("analyze", { jobId, resumeText, candidateId, organizationId });

    res.json({
      success: true,
      jobId,
      message: "Resume analysis started.",
    });
  } catch (err) {
    next(err);
  }
}

export async function getResumeStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError("Unauthorized", 401);

    const { jobId } = req.params;

    const result = await getCache<{
      status: string;
      data?: unknown;
      error?: string;
      organizationId?: string;
    }>(`resume-result:${jobId}`);

    if (!result) {
      throw new AppError("Job not found or expired", 404);
    }

    if (result.organizationId) {
      await assertTeamMember(result.organizationId, userId);
    }

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
