import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { prisma } from "../../config/database";
import { redis } from "../../config/redis";
import { resumeQueue } from "../../queues/resume.queue";
import { sendApplicationConfirmationEmail, sendNewApplicationNotificationEmail } from "../../utils/email";
import { NotificationService } from "../notifications/notification.service";
import { AppError } from "../../utils/errors";

// 5 MB cap for uploaded PDF resumes
export const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new AppError("Only PDF files are allowed", 400));
    }
  },
});

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Magic bytes validation for PDF (%PDF-)
  if (buffer.length < 5 || buffer.toString("utf8", 0, 5) !== "%PDF-") {
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
}

/**
 * Public Job View Endpoint
 * GET /api/public/jobs/:id
 * Probing defense: Draft, Closed, and Nonexistent IDs return the exact same 404 response.
 * Sanitization: Returns only title, department, location, description, and organizationName.
 */
export async function getPublicJob(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    if (!job || job.status !== "OPEN") {
      return res.status(404).json({
        success: false,
        message: "This job is no longer accepting applications.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: job.id,
        title: job.title,
        department: job.department || null,
        location: job.location || null,
        description: job.description,
        organizationName: (job as any).organization?.name || "Company",
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public Job Apply Endpoint
 * POST /api/public/jobs/:id/apply
 */
export async function applyToJob(req: Request, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id as string;
    const { fullName, email, phone, website, _honeypot_trap } = req.body;

    // 1. Honeypot check: Bots filling hidden trap field are silently accepted with no side effects
    if (_honeypot_trap && typeof _honeypot_trap === "string" && _honeypot_trap.trim().length > 0) {
      console.log(`[Apply Honeypot Triggered] Ignored submission for jobId=${jobId}`);
      return res.status(200).json({
        success: true,
        message: "Application submitted successfully.",
      });
    }

    // 2. Validate Job exists and is currently OPEN (including publisher details for notifications)
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!job || job.status !== "OPEN") {
      return res.status(404).json({
        success: false,
        message: "This job is no longer accepting applications.",
      });
    }

    // Basic fields validation
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      throw new AppError("Full name is required (minimum 2 characters).", 400);
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new AppError("A valid email address is required.", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Per-email rate limit (3 applications per email per 24 hours)
    // NOTE: The per-email limiter intentionally counts duplicate submissions too.
    // This bounds total inbound load and prevents spam attempts using the same email address.
    const emailKey = `ratelimit:apply:email:${normalizedEmail}`;
    const submissionsCount = await redis.incr(emailKey);
    if (submissionsCount === 1) {
      await redis.expire(emailKey, 86400); // 24 hours
    }
    if (submissionsCount > 3) {
      return res.status(429).json({
        success: false,
        message: "Too many applications submitted for this email address today. Please try again tomorrow.",
      });
    }

    // 4. Duplicate check / re-submission
    const existing = await prisma.candidate.findUnique({
      where: {
        jobId_email: {
          jobId: job.id,
          email: normalizedEmail,
        },
      },
    });

    // 5. PDF verification & text extraction
    if (!req.file) {
      throw new AppError("Please upload a resume in PDF format.", 400);
    }

    // Check size limit explicitly
    if (req.file.size > 5 * 1024 * 1024) {
      throw new AppError("Resume file size cannot exceed 5 MB.", 400);
    }

    const resumeText = await extractTextFromPDF(req.file.buffer);

    // If candidate already applied, update their application with new resume & re-score
    if (existing) {
      const { saveCandidateResume } = require("../../utils/file-storage");
      const resumeUrl = saveCandidateResume(existing.id, req.file.buffer);

      await prisma.candidate.update({
        where: { id: existing.id },
        data: {
          name: fullName.trim(),
          phone: phone && typeof phone === "string" ? phone.trim() : existing.phone,
          linkedinUrl: website && typeof website === "string" ? website.trim() : existing.linkedinUrl,
          resumeText,
          resumeUrl,
        },
      });

      await prisma.candidateActivity.create({
        data: {
          candidateId: existing.id,
          type: "APPLICATION",
          description: "Updated resume submitted via application link",
        },
      });

      const scoringJobId = randomUUID();
      await resumeQueue.add("analyze", {
        jobId: scoringJobId,
        candidateId: existing.id,
        resumeText,
      });

      return res.status(200).json({
        success: true,
        message: "Application submitted successfully.",
      });
    }

    // 6. Find lowest-order pipeline stage in organization
    const lowestStage = await prisma.pipelineStage.findFirst({
      where: { organizationId: job.organizationId },
      orderBy: { order: "asc" },
    });

    if (!lowestStage) {
      throw new AppError("Organization hiring pipeline is not initialized.", 500);
    }

    // 7. Race-safe Candidate Creation with source=PUBLIC_APPLICATION
    let candidate: any;
    try {
      candidate = await prisma.candidate.create({
        data: {
          name: fullName.trim(),
          email: normalizedEmail,
          phone: phone && typeof phone === "string" ? phone.trim() : null,
          linkedinUrl: website && typeof website === "string" ? website.trim() : null,
          source: "PUBLIC_APPLICATION",
          stageId: lowestStage.id,
          jobId: job.id,
          organizationId: job.organizationId,
          createdById: null,
          resumeText,
        },
      });

      // Save actual uploaded PDF file to disk
      const { saveCandidateResume } = require("../../utils/file-storage");
      const resumeUrl = saveCandidateResume(candidate.id, req.file.buffer);
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { resumeUrl },
      });

      // 8. Applicant timeline entry
      await prisma.candidateActivity.create({
        data: {
          candidateId: candidate.id,
          type: "APPLICATION",
          description: "Applied via public job page",
        },
      });
    } catch (createErr: any) {
      if (createErr.code === "P2002") {
        // Race condition duplicate handled cleanly
        return res.status(200).json({
          success: true,
          message: "Application submitted successfully.",
        });
      }
      throw createErr;
    }

    // 9. Enqueue AI scoring against job description
    const scoringJobId = randomUUID();
    await resumeQueue.add("analyze", {
      jobId: scoringJobId,
      candidateId: candidate.id,
      resumeText,
    });

    // 10. Notifications & Emails (non-blocking, errors logged with IDs, never raw email/resume)
    const orgName = (job as any).organization?.name || "Company";

    // (A) Send confirmation email to applicant
    sendApplicationConfirmationEmail({
      to: normalizedEmail,
      candidateName: candidate.name,
      jobTitle: job.title,
      orgName,
    }).catch((emailErr: any) => {
      console.error(`[Application Confirmation Email Failed] candidateId=${candidate.id}: ${emailErr?.message || emailErr}`);
    });

    // (B) Send new application notification to job publisher / hiring manager
    const creatorEmail = (job as any).createdBy?.email;
    const creatorName = (job as any).createdBy?.name || "Hiring Team";
    if (creatorEmail) {
      sendNewApplicationNotificationEmail({
        to: creatorEmail,
        recruiterName: creatorName,
        candidateName: candidate.name,
        candidateEmail: normalizedEmail,
        candidatePhone: candidate.phone,
        candidateId: candidate.id,
        jobTitle: job.title,
        orgName,
      }).catch((emailErr: any) => {
        console.error(`[Recruiter Application Email Failed] candidateId=${candidate.id}: ${emailErr?.message || emailErr}`);
      });
    }

    // (C) In-app notification for the job publisher
    if (job.createdById) {
      const notificationService = new NotificationService();
      notificationService.createNotification(
        job.createdById,
        "New Application Received",
        `${candidate.name} applied for ${job.title}`
      ).catch((notifErr) => {
        console.error(`[In-app Notification Failed]: ${notifErr?.message || notifErr}`);
      });
    }

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
    });
  } catch (err: any) {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Resume file size cannot exceed 5 MB.",
      });
    }
    next(err);
  }
}