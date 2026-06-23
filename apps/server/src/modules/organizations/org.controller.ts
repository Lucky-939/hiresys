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

// --- Members ---

export async function getMembers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const members = await service.getMembers(req.params.orgId as string);
    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
}

export async function inviteMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, role } = req.body;
    const invite = await service.inviteMember(req.params.orgId as string, email, role, req.userId!);
    res.json({ success: true, data: invite });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { role } = req.body;
    const member = await service.updateMemberRole(req.params.orgId as string, req.params.userId as string, role, req.userId!);
    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await service.removeMember(req.params.orgId as string, req.params.userId as string, req.userId!);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// --- Invites ---

export async function getInvite(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const invite = await service.getInviteByToken(req.params.token as string);
    res.json({ success: true, data: invite });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvite(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await service.acceptInvite(req.params.token as string, req.userId!);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
