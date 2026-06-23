"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const dashboard_service_1 = require("./dashboard.service");
const service = new dashboard_service_1.DashboardService();
const getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.userId;
        const organizationId = req.headers["x-organization-id"];
        if (!organizationId) {
            return res.status(400).json({ success: false, message: "Organization ID is required in headers" });
        }
        const stats = await service.getStats(organizationId);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardStats = getDashboardStats;
