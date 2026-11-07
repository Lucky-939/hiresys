import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { JobService } from "./job.service";
import { OrgService } from "../organizations/org.service";
import { AppError } from "../../utils/errors";

const service = new JobService();
const orgService = new OrgService();

export async function createJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let orgId = req.body.organizationId;
    if (!orgId) {
      const userOrgs = await orgService.getUserOrgs(req.userId!);
      if (userOrgs && userOrgs.length > 0) {
        orgId = userOrgs[0].id;
      }
    }

    if (!orgId) {
      throw new AppError("No active organization found. Please select or create an organization.", 400);
    }

    const job = await service.createJob(orgId, req.userId!, req.body);
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}

export async function getJobsByOrg(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobs = await service.getJobsByOrg(req.params.orgId as string, req.userId!);
    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
}

export async function getJobById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const job = await service.getJobById(req.params.id as string, req.userId!);
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}

export async function updateJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const job = await service.updateJob(req.params.id as string, req.userId!, req.body);
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}

export async function deleteJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await service.deleteJob(req.params.id as string, req.userId!);
    res.json({ success: true, message: "Job deleted successfully" });
  } catch (err) {
    next(err);
  }
}
