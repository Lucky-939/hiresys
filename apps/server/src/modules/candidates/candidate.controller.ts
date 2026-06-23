import { Response, Request, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { CandidateService } from "./candidate.service";

const candidateService = new CandidateService();

export const exportCandidatesCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const orgId = req.params.orgId as string;

    const csvData = await candidateService.exportCandidatesCSV(orgId, userId);

    res.header("Content-Type", "text/csv");
    res.attachment(`candidates-${orgId}-${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csvData);
  } catch (err) {
    next(err);
  }
};

export const createCandidate = async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const candidate = await candidateService.createCandidate({
    ...data,
    userId: req.userId!,
  });
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
