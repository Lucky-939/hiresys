import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorMiddleware } from "./middleware/error.middleware";
import { globalLimiter, authLimiter, aiLimiter } from "./middleware/rate-limit.middleware";
import { authRoutes } from "./modules/auth/auth.routes";
import { orgRoutes } from "./modules/organizations/org.routes";
import { interviewRoutes } from "./modules/interviews/interview.routes";
import { aiRoutes } from "./modules/ai/ai.routes";
import { reportRoutes } from "./modules/reports/report.routes";
import { candidateRoutes } from "./modules/candidates/candidate.routes";

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(
  morgan((tokens, req, res) => {
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
  })
);
app.use(express.json());

// Apply global rate limiter
app.use(globalLimiter);

app.use("/api/ai", aiRoutes);

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
    await prisma.$queryRaw`SELECT 1`;
    // Check Redis
    await redis.ping();
    
    res.status(200).json({ status: "READY" });
  } catch (err) {
    res.status(503).json({ status: "UNAVAILABLE", error: (err as Error).message });
  }
});
app.get("/health", (_req, res) => res.status(200).json({ status: "OK", timestamp: new Date().toISOString() }));

app.post("/test", (_req, res) => res.json({ works: true }));

import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { notificationRoutes } from "./modules/notifications/notification.routes";

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/organizations", orgRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(errorMiddleware);

export default app;
