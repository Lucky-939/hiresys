import { Request, Response, NextFunction } from "express";
import { DashboardService } from "./dashboard.service";
import { assertTeamMember } from "../../utils/rbac";

const service = new DashboardService();

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const organizationId = (req.headers["x-organization-id"] as string) || (req.query.orgId as string) || (req.query.organizationId as string);

    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required in headers" });
    }

    await assertTeamMember(organizationId, userId);

    const stats = await service.getStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
