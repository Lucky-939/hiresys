"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOrgRole = requireOrgRole;
const database_1 = require("../config/database");
const errors_1 = require("../utils/errors");
function requireOrgRole(...allowedRoles) {
    return async (req, res, next) => {
        try {
            const userId = req.userId;
            if (!userId) {
                throw new errors_1.AppError("Unauthorized", 401);
            }
            const orgId = req.params.orgId || req.body.organizationId;
            if (!orgId) {
                throw new errors_1.AppError("Organization ID is required", 400);
            }
            const membership = await database_1.prisma.organizationMember.findUnique({
                where: {
                    userId_organizationId: {
                        userId,
                        organizationId: orgId,
                    },
                },
            });
            if (!membership) {
                throw new errors_1.AppError("Access denied: Not a member of this organization", 403);
            }
            if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
                throw new errors_1.AppError("Access denied: Insufficient role", 403);
            }
            // Attach member role to request for later use
            req.orgRole = membership.role;
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
