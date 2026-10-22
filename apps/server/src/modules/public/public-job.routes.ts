import { Router } from "express";
import { getPublicJob, applyToJob, uploadResume } from "./public-job.controller";
import { publicJobViewLimiter, publicApplyLimiter } from "../../middleware/rate-limit.middleware";

export const publicJobRoutes = Router();

publicJobRoutes.get(
  "/jobs/:id",
  publicJobViewLimiter,
  getPublicJob
);

publicJobRoutes.post(
  "/jobs/:id/apply",
  publicApplyLimiter,
  uploadResume.single("resume"),
  applyToJob
);
