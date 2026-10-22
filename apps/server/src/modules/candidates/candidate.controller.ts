import { Response, Request, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { CandidateService } from "./candidate.service";
import { AppError } from "../../utils/errors";

const candidateService = new CandidateService();

export const exportCandidatesCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const orgId = (req.params.orgId as string) || (req.query.orgId as string) || (req.query.organizationId as string);

    const csvData = await candidateService.exportCandidatesCSV(orgId, userId);

    res.header("Content-Type", "text/csv");
    res.attachment(`candidates-${orgId}-${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csvData);
  } catch (err) {
    next(err);
  }
};

import { NotificationService } from "../notifications/notification.service";

const notificationService = new NotificationService();

export const createCandidate = async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const candidate = await candidateService.createCandidate({
    ...data,
    userId: req.userId!,
  });
  
  // Emit a real-time notification to the user who created it
  await notificationService.createNotification(
    req.userId!,
    "New Candidate Added",
    `You successfully added ${candidate.name} to the pipeline.`
  );

  res.status(201).json({ success: true, data: candidate });
};

export const getCandidatesByOrg = async (req: AuthRequest, res: Response) => {
  const orgId = req.params.orgId as string;
  const candidates = await candidateService.getCandidatesByOrg(orgId, req.userId!);
  res.json({ success: true, data: candidates });
};

export const getCandidateById = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const data = await candidateService.getCandidateById(id, req.userId!);
  res.json({ success: true, data });
};

export const updateCandidate = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const data = req.body;
  const candidate = await candidateService.updateCandidate(id, req.userId!, data);
  res.json({ success: true, data: candidate });
};

export const deleteCandidate = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  await candidateService.deleteCandidate(id, req.userId!);
  res.json({ success: true, message: "Candidate deleted successfully" });
};

export const updateCandidateStage = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { stage } = req.body;
  const candidate = await candidateService.moveCandidateStage(id, stage, req.userId!);
  res.json({ success: true, data: candidate });
};

export const updateCandidateDecision = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { decision, notes } = req.body;
  const candidate = await candidateService.makeHiringDecision(id, decision, notes, req.userId!);
  res.json({ success: true, data: candidate });
};

export const sendCandidateOutcomeEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { templateType, subject, message } = req.body;
    const result = await candidateService.sendOutcomeEmail(id, req.userId!, {
      templateType,
      subject,
      message,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getCandidateResumeFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { candidate } = await candidateService.getCandidateById(id, req.userId!);

    const { getCandidateResumePath } = require("../../utils/file-storage");
    const filePath = getCandidateResumePath(id);

    if (!filePath) {
      throw new AppError("No PDF resume file found for this candidate. Only extracted text is available.", 404);
    }

    const safeName = (candidate.name || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}_Resume.pdf"`);
    res.removeHeader("X-Frame-Options");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
};
