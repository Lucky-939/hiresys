"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewService = void 0;
const interview_repository_1 = require("./interview.repository");
const org_repository_1 = require("../organizations/org.repository");
const errors_1 = require("../../utils/errors");
const repo = new interview_repository_1.InterviewRepository();
const orgRepo = new org_repository_1.OrgRepository();
class InterviewService {
    async assertMember(organizationId, userId) {
        const org = await orgRepo.findById(organizationId);
        if (!org)
            throw new errors_1.AppError("Organization not found", 404);
        const isMember = org.members.some((m) => m.userId === userId);
        if (!isMember)
            throw new errors_1.AppError("Access denied", 403);
    }
    async create(data) {
        await this.assertMember(data.organizationId, data.userId);
        return repo.create({
            title: data.title,
            description: data.description,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            organizationId: data.organizationId,
            createdById: data.userId,
            candidateId: data.candidateId,
        });
    }
    async getByOrg(organizationId, userId) {
        await this.assertMember(organizationId, userId);
        return repo.findByOrg(organizationId);
    }
    async getById(id, userId) {
        const interview = await repo.findById(id);
        if (!interview)
            throw new errors_1.AppError("Interview not found", 404);
        await this.assertMember(interview.organizationId, userId);
        return interview;
    }
    async update(id, userId, data) {
        const interview = await repo.findById(id);
        if (!interview)
            throw new errors_1.AppError("Interview not found", 404);
        await this.assertMember(interview.organizationId, userId);
        if (interview.status === "COMPLETED") {
            throw new errors_1.AppError("Completed interviews cannot be modified.", 409);
        }
        return repo.update(id, {
            ...data,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        });
    }
    async delete(id, userId) {
        const interview = await repo.findById(id);
        if (!interview)
            throw new errors_1.AppError("Interview not found", 404);
        await this.assertMember(interview.organizationId, userId);
        return repo.delete(id);
    }
}
exports.InterviewService = InterviewService;
