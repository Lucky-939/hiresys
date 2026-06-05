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
    if (!req.file) throw new AppError("No PDF file uploaded", 400);

    const resumeText = await extractTextFromPDF(req.file.buffer);

    if (!resumeText || resumeText.trim().length < 50) {
      throw new AppError(
        "Could not extract text from PDF. Make sure it has selectable text and is not a scanned image.",
        400,
      );
    }

    const jobId = randomUUID();

    await setCache(`resume-result:${jobId}`, { status: "processing" }, 3600);
    await resumeQueue.add("analyze", { jobId, resumeText });

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
    const { jobId } = req.params;

    const result = await getCache<{
      status: string;
      data?: unknown;
      error?: string;
    }>(`resume-result:${jobId}`);

    if (!result) {
      throw new AppError("Job not found or expired", 404);
    }

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
