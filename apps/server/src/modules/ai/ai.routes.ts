import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { getQuestions } from "./question.controller";
import { getCodeFeedback } from "./feedback.controller";
import { analyzeResume, getResumeStatus, upload } from "./resume.controller";

export const aiRoutes = Router();

aiRoutes.use(authenticate);

aiRoutes.post("/questions", getQuestions);
aiRoutes.post("/feedback", getCodeFeedback);
aiRoutes.post("/resume", upload.single("resume"), analyzeResume);
aiRoutes.get("/resume/status/:jobId", getResumeStatus);
