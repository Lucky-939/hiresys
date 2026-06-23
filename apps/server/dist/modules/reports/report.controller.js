"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReport = createReport;
exports.getReport = getReport;
const interview_repository_1 = require("../interviews/interview.repository");
const org_repository_1 = require("../organizations/org.repository");
const report_service_1 = require("./report.service");
const errors_1 = require("../../utils/errors");
const interviewRepo = new interview_repository_1.InterviewRepository();
const orgRepo = new org_repository_1.OrgRepository();
/**
 * Validates that:
 * 1. The interview exists
 * 2. The interview belongs to an org the user is a member of
 * 3. The interview status is COMPLETED
 */
async function validateInterviewAccess(interviewId, userId) {
    const interview = await interviewRepo.findById(interviewId);
    if (!interview)
        throw new errors_1.AppError("Interview not found", 404);
    const org = await orgRepo.findById(interview.organizationId);
    if (!org)
        throw new errors_1.AppError("Organization not found", 404);
    const isMember = org.members.some((m) => m.userId === userId);
    if (!isMember)
        throw new errors_1.AppError("Access denied", 403);
    return interview;
}
async function createReport(req, res, next) {
    try {
        const interviewId = req.params.interviewId;
        const interview = await validateInterviewAccess(interviewId, req.userId);
        if (interview.status !== "COMPLETED") {
            throw new errors_1.AppError("Report can only be generated for completed interviews", 400);
        }
        const { codeSubmitted = "", language = "javascript", questionsAsked = [], resumeScore, interviewNotes = "", } = req.body;
        const report = await (0, report_service_1.generateReport)(interviewId, {
            interviewTitle: interview.title,
            codeSubmitted,
            language,
            questionsAsked,
            resumeScore,
            interviewNotes,
        });
        res.status(201).json({ success: true, data: report });
    }
    catch (err) {
        next(err);
    }
}
async function getReport(req, res, next) {
    try {
        const interviewId = req.params.interviewId;
        await validateInterviewAccess(interviewId, req.userId);
        const report = await (0, report_service_1.getReportByInterviewId)(interviewId);
        if (!report)
            throw new errors_1.AppError("Report not found for this interview", 404);
        res.json({ success: true, data: report });
    }
    catch (err) {
        next(err);
    }
}
