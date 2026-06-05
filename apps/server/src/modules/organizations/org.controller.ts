import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { OrgService } from "./org.service";

const service = new OrgService();

export async function createOrg(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name } = req.body;
    const org = await service.createOrg(name, req.userId!);
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrgs(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const orgs = await service.getUserOrgs(req.userId!);
    res.json({ success: true, data: orgs });
  } catch (err) {
    next(err);
  }
}

export async function getOrgById(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const org = await service.getOrgById(req.params.id as string, req.userId!);
    res.json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
}
