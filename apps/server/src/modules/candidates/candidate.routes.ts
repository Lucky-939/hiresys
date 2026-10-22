import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireOrgRole } from "../../middleware/rbac.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  createCandidate,
  getCandidatesByOrg,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  updateCandidateStage,
  updateCandidateDecision,
  exportCandidatesCSV,
  sendCandidateOutcomeEmail,
  getCandidateResumeFile,
} from "./candidate.controller";

export const candidateRoutes = Router();

candidateRoutes.post(
  "/",
  authenticate,
  validateRequest([
    { field: "name", required: true, type: "string", minLength: 2 },
    { field: "email", required: true, type: "string", minLength: 5 },
    { field: "organizationId", required: true, type: "string", minLength: 5 },
    { field: "phone", required: false, type: "string" },
    { field: "linkedinUrl", required: false, type: "string" },
    { field: "stage", required: false, type: "string" },
    { field: "jobId", required: false, type: "string" },
  ]),
  createCandidate
);

candidateRoutes.get("/", authenticate, requireOrgRole("OWNER", "ADMIN", "RECRUITER"), getCandidatesByOrg);
candidateRoutes.get("/org/:orgId", authenticate, requireOrgRole("OWNER", "ADMIN", "RECRUITER"), getCandidatesByOrg);
candidateRoutes.get("/org/:orgId/export", authenticate, requireOrgRole("OWNER", "ADMIN", "RECRUITER"), exportCandidatesCSV);
candidateRoutes.get("/:id/resume/file", authenticate, getCandidateResumeFile);
candidateRoutes.get("/:id", authenticate, getCandidateById);

candidateRoutes.patch(
  "/:id",
  authenticate,
  validateRequest([
    { field: "name", required: false, type: "string" },
    { field: "email", required: false, type: "string" },
    { field: "phone", required: false, type: "string" },
    { field: "linkedinUrl", required: false, type: "string" },
    { field: "stage", required: false, type: "string" },
    { field: "resumeScore", required: false, type: "number" },
    { field: "atsScore", required: false, type: "number" },
  ]),
  updateCandidate
);

candidateRoutes.delete("/:id", authenticate, deleteCandidate);

candidateRoutes.patch(
  "/:id/stage",
  authenticate,
  (req, _res, next) => {
    if (!req.body.stage && req.body.stageId) {
      req.body.stage = req.body.stageId;
    }
    next();
  },
  validateRequest([
    { field: "stage", required: true, type: "string" },
  ]),
  updateCandidateStage
);

candidateRoutes.patch(
  "/:id/decision",
  authenticate,
  validateRequest([
    { field: "decision", required: true, type: "string" },
    { field: "notes", required: true, type: "string" },
  ]),
  updateCandidateDecision
);

candidateRoutes.post(
  "/:id/outcome-email",
  authenticate,
  validateRequest([
    { field: "subject", required: true, type: "string", minLength: 1 },
    { field: "message", required: true, type: "string", minLength: 1 },
  ]),
  sendCandidateOutcomeEmail
);
