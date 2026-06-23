"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCodeFeedback = getCodeFeedback;
const feedback_service_1 = require("./feedback.service");
const interview_service_1 = require("../interviews/interview.service");
const errors_1 = require("../../utils/errors");
const interviewService = new interview_service_1.InterviewService();
async function getCodeFeedback(req, res, next) {
    try {
        const { code, language, interviewId } = req.body;
        if (!code || !language)
            throw new errors_1.AppError("code and language are required", 400);
        if (code.trim().length < 10)
            throw new errors_1.AppError("Code is too short to analyze", 400);
        if (interviewId && req.userId) {
            const interview = await interviewService.getById(interviewId, req.userId);
            if (interview.status === "COMPLETED") {
                throw new errors_1.AppError("Completed interviews cannot use AI", 403);
            }
        }
        const feedback = await (0, feedback_service_1.generateCodeFeedback)(code, language);
        res.json({ success: true, data: feedback });
    }
    catch (err) {
        next(err);
    }
}
