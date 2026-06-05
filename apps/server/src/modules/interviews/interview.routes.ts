import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createInterview,
  getInterviews,
  getInterview,
  updateInterview,
  deleteInterview,
} from "./interview.controller";

export const interviewRoutes = Router();

interviewRoutes.use(authenticate);

interviewRoutes.post("/", createInterview);
interviewRoutes.get("/org/:orgId", getInterviews);
interviewRoutes.get("/:id", getInterview);
interviewRoutes.patch("/:id", updateInterview);
interviewRoutes.delete("/:id", deleteInterview);
