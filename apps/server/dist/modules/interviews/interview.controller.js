"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInterview = createInterview;
exports.getInterviews = getInterviews;
exports.getInterview = getInterview;
exports.updateInterview = updateInterview;
exports.deleteInterview = deleteInterview;
const interview_service_1 = require("./interview.service");
const service = new interview_service_1.InterviewService();
async function createInterview(req, res, next) {
    try {
        const interview = await service.create({
            ...req.body,
            userId: req.userId,
        });
        res.status(201).json({ success: true, data: interview });
    }
    catch (err) {
        next(err);
    }
}
async function getInterviews(req, res, next) {
    try {
        const interviews = await service.getByOrg(req.params.orgId, req.userId);
        res.json({ success: true, data: interviews });
    }
    catch (err) {
        next(err);
    }
}
async function getInterview(req, res, next) {
    try {
        const interview = await service.getById(req.params.id, req.userId);
        res.json({ success: true, data: interview });
    }
    catch (err) {
        next(err);
    }
}
async function updateInterview(req, res, next) {
    try {
        const interview = await service.update(req.params.id, req.userId, req.body);
        res.json({ success: true, data: interview });
    }
    catch (err) {
        next(err);
    }
}
async function deleteInterview(req, res, next) {
    try {
        await service.delete(req.params.id, req.userId);
        res.json({ success: true, message: "Interview deleted" });
    }
    catch (err) {
        next(err);
    }
}
