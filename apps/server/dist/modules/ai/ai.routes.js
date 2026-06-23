"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const question_controller_1 = require("./question.controller");
const feedback_controller_1 = require("./feedback.controller");
const resume_controller_1 = require("./resume.controller");
exports.aiRoutes = (0, express_1.Router)();
exports.aiRoutes.use(auth_middleware_1.authenticate);
exports.aiRoutes.post("/questions", (0, validate_middleware_1.validateRequest)([
    { field: "role", required: true, type: "string", minLength: 2 },
    { field: "difficulty", required: true, type: "string", minLength: 3 },
]), question_controller_1.getQuestions);
exports.aiRoutes.post("/feedback", (0, validate_middleware_1.validateRequest)([
    { field: "code", required: true, type: "string", minLength: 10 },
    { field: "language", required: true, type: "string", minLength: 1 },
]), feedback_controller_1.getCodeFeedback);
exports.aiRoutes.post("/resume", resume_controller_1.upload.single("resume"), resume_controller_1.analyzeResume);
exports.aiRoutes.get("/resume/status/:jobId", resume_controller_1.getResumeStatus);
