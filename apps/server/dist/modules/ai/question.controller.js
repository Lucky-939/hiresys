"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuestions = getQuestions;
const question_service_1 = require("./question.service");
const interview_service_1 = require("../interviews/interview.service");
const errors_1 = require("../../utils/errors");
const interviewService = new interview_service_1.InterviewService();
async function getQuestions(req, res, next) {
    try {
        const { role, difficulty, count, interviewId } = req.body;
        if (!role || !difficulty) {
            throw new errors_1.AppError("role and difficulty are required", 400);
        }
        if (interviewId && req.userId) {
            const interview = await interviewService.getById(interviewId, req.userId);
            if (interview.status === "COMPLETED") {
                throw new errors_1.AppError("Completed interviews cannot use AI", 403);
            }
        }
        const questions = await (0, question_service_1.generateInterviewQuestions)(role, difficulty, count || 5);
        res.json({ success: true, data: questions });
    }
    catch (err) {
        next(err);
    }
}
