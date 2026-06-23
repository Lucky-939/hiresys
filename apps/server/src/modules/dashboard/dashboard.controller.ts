import { Request, Response, NextFunction } from "express";
import { DashboardService } from "./dashboard.service";

const service = new DashboardService();

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const organizationId = req.headers["x-organization-id"] as string;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required in headers" });
    }

    const stats = await service.getStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
