import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { prisma } from "../config/database";
import { AppError } from "../utils/errors";

export function requireOrgRole(...allowedRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError("Unauthorized", 401);
      }

      const orgId = req.params.orgId || req.body.organizationId;
      if (!orgId) {
        throw new AppError("Organization ID is required", 400);
      }

      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: orgId,
          },
        },
      });

      if (!membership) {
        throw new AppError("Access denied: Not a member of this organization", 403);
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        throw new AppError("Access denied: Insufficient role", 403);
      }

      // Attach member role to request for later use
      (req as any).orgRole = membership.role;
      
      next();
    } catch (err) {
      next(err);
    }
  };
}
