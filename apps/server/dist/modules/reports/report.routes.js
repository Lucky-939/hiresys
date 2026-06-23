"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const report_controller_1 = require("./report.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
exports.reportRoutes = (0, express_1.Router)();
exports.reportRoutes.use(auth_middleware_1.authenticate);
exports.reportRoutes.post("/:interviewId/generate", (0, validate_middleware_1.validateRequest)([
    { field: "codeSubmitted", required: false, type: "string" },
    { field: "language", required: false, type: "string" },
    { field: "questionsAsked", required: false, type: "array" },
    { field: "resumeScore", required: false, type: "number" },
]), report_controller_1.createReport);
exports.reportRoutes.get("/:interviewId", report_controller_1.getReport);
