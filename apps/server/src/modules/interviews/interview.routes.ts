import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createInterview,
  getInterviews,
  getInterview,
  updateInterview,
  deleteInterview,
} from "./interview.controller";
import { validateRequest } from "../../middleware/validate.middleware";

export const interviewRoutes = Router();

interviewRoutes.use(authenticate);

interviewRoutes.post(
  "/",
  validateRequest([
    { field: "title", required: true, type: "string", minLength: 2 },
    { field: "organizationId", required: true, type: "string" },
    { field: "candidateId", required: false, type: "string" },
  ]),
  createInterview
);
interviewRoutes.get("/org/:orgId", getInterviews);
interviewRoutes.get("/:id", getInterview);
interviewRoutes.patch(
  "/:id",
  validateRequest([
    { field: "title", required: false, type: "string" },
    { field: "description", required: false, type: "string" },
    { field: "status", required: false, type: "string" },
    { field: "scheduledAt", required: false, type: "string" },
    { field: "candidateId", required: false, type: "string" },
    { field: "codeSubmitted", required: false, type: "string" },
    { field: "language", required: false, type: "string" },
    { field: "interviewNotes", required: false, type: "string" },
  ]),
  updateInterview
);
interviewRoutes.delete("/:id", deleteInterview);

interviewRoutes.patch(
  "/:id/candidate",
  validateRequest([
    { field: "candidateId", required: true, type: "string" },
  ]),
  updateInterview
);

