import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { createReport, getReport } from "./report.controller";
import { validateRequest } from "../../middleware/validate.middleware";

export const reportRoutes = Router();

reportRoutes.use(authenticate);

reportRoutes.post(
  "/:interviewId/generate",
  validateRequest([
    { field: "codeSubmitted", required: false, type: "string" },
    { field: "language", required: false, type: "string" },
    { field: "questionsAsked", required: false, type: "array" },
    { field: "resumeScore", required: false, type: "number" },
  ]),
  createReport
);
reportRoutes.get("/:interviewId", getReport);

