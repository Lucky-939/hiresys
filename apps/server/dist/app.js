"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const error_middleware_1 = require("./middleware/error.middleware");
const rate_limit_middleware_1 = require("./middleware/rate-limit.middleware");
const auth_routes_1 = require("./modules/auth/auth.routes");
const org_routes_1 = require("./modules/organizations/org.routes");
const interview_routes_1 = require("./modules/interviews/interview.routes");
const ai_routes_1 = require("./modules/ai/ai.routes");
const report_routes_1 = require("./modules/reports/report.routes");
const candidate_routes_1 = require("./modules/candidates/candidate.routes");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: process.env.CLIENT_URL, credentials: true }));
app.use((0, morgan_1.default)((tokens, req, res) => {
    return JSON.stringify({
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: tokens.status(req, res),
        content_length: tokens.res(req, res, 'content-length'),
        response_time: tokens['response-time'](req, res),
        remote_addr: tokens['remote-addr'](req, res),
        user_agent: tokens['user-agent'](req, res),
        timestamp: new Date().toISOString(),
    });
}));
app.use(express_1.default.json());
// Apply global rate limiter
app.use(rate_limit_middleware_1.globalLimiter);
app.use("/api/ai", rate_limit_middleware_1.aiLimiter, ai_routes_1.aiRoutes);
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Health Checks
app.get("/health/live", (_req, res) => res.status(200).json({ status: "UP" }));
app.get("/health/ready", async (_req, res) => {
    try {
        const { prisma } = require("./config/database");
        const { redis } = require("./config/redis");
        // Check DB
        await prisma.$queryRaw `SELECT 1`;
        // Check Redis
        await redis.ping();
        res.status(200).json({ status: "READY" });
    }
    catch (err) {
        res.status(503).json({ status: "UNAVAILABLE", error: err.message });
    }
});
app.get("/health", (_req, res) => res.status(200).json({ status: "OK", timestamp: new Date().toISOString() }));
app.post("/test", (_req, res) => res.json({ works: true }));
const dashboard_routes_1 = require("./modules/dashboard/dashboard.routes");
app.use("/api/auth", rate_limit_middleware_1.authLimiter, auth_routes_1.authRoutes);
app.use("/api/organizations", org_routes_1.orgRoutes);
app.use("/api/interviews", interview_routes_1.interviewRoutes);
app.use("/api/reports", report_routes_1.reportRoutes);
app.use("/api/candidates", candidate_routes_1.candidateRoutes);
app.use("/api/dashboard", dashboard_routes_1.dashboardRoutes);
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
