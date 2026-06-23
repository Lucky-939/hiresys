import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
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
  ]),
  createCandidate
);

candidateRoutes.get("/org/:orgId", authenticate, getCandidatesByOrg);
candidateRoutes.get("/org/:orgId/export", authenticate, exportCandidatesCSV);
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
