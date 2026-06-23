import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { getQuestions } from "./question.controller";
import { getCodeFeedback } from "./feedback.controller";
import { analyzeResume, getResumeStatus, upload } from "./resume.controller";

export const aiRoutes = Router();

aiRoutes.use(authenticate);

aiRoutes.post(
  "/questions",
  validateRequest([
    { field: "role", required: true, type: "string", minLength: 2 },
    { field: "difficulty", required: true, type: "string", minLength: 3 },
  ]),
  getQuestions
);

aiRoutes.post(
  "/feedback",
  validateRequest([
    { field: "code", required: true, type: "string", minLength: 10 },
    { field: "language", required: true, type: "string", minLength: 1 },
  ]),
  getCodeFeedback
);

aiRoutes.post("/resume", upload.single("resume"), analyzeResume);
aiRoutes.get("/resume/status/:jobId", getResumeStatus);
