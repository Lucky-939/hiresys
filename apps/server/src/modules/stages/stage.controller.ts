import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { StageService } from "./stage.service";

const service = new StageService();

export async function getStages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orgId = (req.params.orgId as string) || (req.query.orgId as string) || (req.query.organizationId as string);
    const stages = await service.getStages(orgId, req.userId!);
    res.json({ success: true, data: stages });
  } catch (err) {
    next(err);
  }
}

export async function createStage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const stage = await service.createStage(orgId, req.userId!, req.body);
    res.status(201).json({ success: true, data: stage });
  } catch (err) {
    next(err);
  }
}

export async function updateStage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const stageId = req.params.stageId as string;
    const stage = await service.updateStage(orgId, req.userId!, stageId, req.body);
    res.json({ success: true, data: stage });
  } catch (err) {
    next(err);
  }
}

export async function updateStageOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const stages = await service.updateStageOrders(orgId, req.userId!, req.body.stageOrders);
    res.json({ success: true, data: stages });
  } catch (err) {
    next(err);
  }
}

export async function deleteStage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const stageId = req.params.stageId as string;
    await service.deleteStage(orgId, req.userId!, stageId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
