"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateRoutes = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const candidate_controller_1 = require("./candidate.controller");
exports.candidateRoutes = (0, express_1.Router)();
exports.candidateRoutes.post("/", auth_middleware_1.authenticate, (0, validate_middleware_1.validateRequest)([
    { field: "name", required: true, type: "string", minLength: 2 },
    { field: "email", required: true, type: "string", minLength: 5 },
    { field: "organizationId", required: true, type: "string", minLength: 5 },
    { field: "phone", required: false, type: "string" },
    { field: "linkedinUrl", required: false, type: "string" },
    { field: "stage", required: false, type: "string" },
]), candidate_controller_1.createCandidate);
exports.candidateRoutes.get("/org/:orgId", auth_middleware_1.authenticate, candidate_controller_1.getCandidatesByOrg);
exports.candidateRoutes.get("/org/:orgId/export", auth_middleware_1.authenticate, candidate_controller_1.exportCandidatesCSV);
exports.candidateRoutes.get("/:id", auth_middleware_1.authenticate, candidate_controller_1.getCandidateById);
exports.candidateRoutes.patch("/:id", auth_middleware_1.authenticate, (0, validate_middleware_1.validateRequest)([
    { field: "name", required: false, type: "string" },
    { field: "email", required: false, type: "string" },
    { field: "phone", required: false, type: "string" },
    { field: "linkedinUrl", required: false, type: "string" },
    { field: "stage", required: false, type: "string" },
    { field: "resumeScore", required: false, type: "number" },
    { field: "atsScore", required: false, type: "number" },
]), candidate_controller_1.updateCandidate);
exports.candidateRoutes.delete("/:id", auth_middleware_1.authenticate, candidate_controller_1.deleteCandidate);
exports.candidateRoutes.patch("/:id/stage", auth_middleware_1.authenticate, (0, validate_middleware_1.validateRequest)([
    { field: "stage", required: true, type: "string" },
]), candidate_controller_1.updateCandidateStage);
exports.candidateRoutes.patch("/:id/decision", auth_middleware_1.authenticate, (0, validate_middleware_1.validateRequest)([
    { field: "decision", required: true, type: "string" },
    { field: "notes", required: true, type: "string" },
]), candidate_controller_1.updateCandidateDecision);
