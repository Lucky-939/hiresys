"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewRoutes = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const interview_controller_1 = require("./interview.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
exports.interviewRoutes = (0, express_1.Router)();
exports.interviewRoutes.use(auth_middleware_1.authenticate);
exports.interviewRoutes.post("/", (0, validate_middleware_1.validateRequest)([
    { field: "title", required: true, type: "string", minLength: 2 },
    { field: "organizationId", required: true, type: "string" },
    { field: "candidateId", required: false, type: "string" },
]), interview_controller_1.createInterview);
exports.interviewRoutes.get("/org/:orgId", interview_controller_1.getInterviews);
exports.interviewRoutes.get("/:id", interview_controller_1.getInterview);
exports.interviewRoutes.patch("/:id", (0, validate_middleware_1.validateRequest)([
    { field: "title", required: false, type: "string" },
    { field: "description", required: false, type: "string" },
    { field: "status", required: false, type: "string" },
    { field: "scheduledAt", required: false, type: "string" },
    { field: "candidateId", required: false, type: "string" },
    { field: "codeSubmitted", required: false, type: "string" },
    { field: "language", required: false, type: "string" },
    { field: "interviewNotes", required: false, type: "string" },
]), interview_controller_1.updateInterview);
exports.interviewRoutes.delete("/:id", interview_controller_1.deleteInterview);
exports.interviewRoutes.patch("/:id/candidate", (0, validate_middleware_1.validateRequest)([
    { field: "candidateId", required: true, type: "string" },
]), interview_controller_1.updateInterview);
