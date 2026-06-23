"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateService = void 0;
const candidate_repository_1 = require("./candidate.repository");
const org_repository_1 = require("../organizations/org.repository");
const interview_repository_1 = require("../interviews/interview.repository");
const errors_1 = require("../../utils/errors");
const database_1 = require("../../config/database");
const repo = new candidate_repository_1.CandidateRepository();
const orgRepo = new org_repository_1.OrgRepository();
const interviewRepo = new interview_repository_1.InterviewRepository();
class CandidateService {
    async assertMember(organizationId, userId) {
        const org = await orgRepo.findById(organizationId);
        if (!org)
            throw new errors_1.AppError("Organization not found", 404);
        const member = org.members.find((m) => m.userId === userId);
        if (!member)
            throw new errors_1.AppError("Access denied", 403);
        return member;
    }
    async assertRole(organizationId, userId, allowedRoles) {
        const member = await this.assertMember(organizationId, userId);
        if (!allowedRoles.includes(member.role)) {
            throw new errors_1.AppError("Insufficient permissions. Action requires: " + allowedRoles.join(", "), 403);
        }
        return member;
    }
    async createCandidate(data) {
        await this.assertMember(data.organizationId, data.userId);
        const existing = await repo.findByEmail(data.organizationId, data.email);
        if (existing) {
            throw new errors_1.AppError("A candidate with this email already exists in this organization", 400);
        }
        return repo.create({
            name: data.name,
            email: data.email,
            phone: data.phone,
            linkedinUrl: data.linkedinUrl,
            stage: data.stage,
            resumeText: data.resumeText,
            resumeScore: data.resumeScore,
            atsScore: data.atsScore,
            organization: { connect: { id: data.organizationId } },
            createdBy: { connect: { id: data.userId } },
        });
    }
    async getCandidatesByOrg(organizationId, userId) {
        await this.assertMember(organizationId, userId);
        const candidates = await repo.findByOrg(organizationId);
        return candidates.map((candidate) => {
            const reports = candidate.interviews
                .map((iv) => iv.report)
                .filter(Boolean);
            const latestReport = reports[0];
            const latestInterviewDate = candidate.interviews[0]?.createdAt;
            return {
                ...candidate,
                interviewsCount: candidate.interviews.length,
                latestScore: latestReport?.overallScore || null,
                latestRecommendation: latestReport?.recommendation || null,
                latestInterviewDate: latestInterviewDate || null,
            };
        });
    }
    async getCandidateById(id, userId) {
        const candidate = await repo.findById(id);
        if (!candidate)
            throw new errors_1.AppError("Candidate not found", 404);
        await this.assertMember(candidate.organizationId, userId);
        const reports = candidate.interviews
            .map((iv) => iv.report)
            .filter(Boolean);
        const totalInterviews = candidate.interviews.length;
        const scores = reports.map((r) => r.overallScore);
        const highestScore = scores.length > 0 ? Math.max(...scores) : null;
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        const latestReport = reports[0]; // because we ordered by desc in repo
        const latestInterviewDate = candidate.interviews[0]?.createdAt || null;
        // Timeline Events
        const timeline = [];
        timeline.push({ type: "CANDIDATE_CREATED", date: candidate.createdAt, description: "Candidate profile created" });
        if (candidate.resumeScore !== null) {
            // Approximate resume analysis date using createdAt, or updated if you track that separately
            timeline.push({ type: "RESUME_ANALYZED", date: candidate.updatedAt, description: "Resume analysis completed" });
        }
        for (const iv of candidate.interviews) {
            timeline.push({ type: "INTERVIEW_SCHEDULED", date: iv.createdAt, description: `Interview '${iv.title}' scheduled` });
            if (iv.status === "COMPLETED") {
                timeline.push({ type: "INTERVIEW_COMPLETED", date: iv.updatedAt, description: `Interview '${iv.title}' completed` });
            }
            if (iv.report) {
                timeline.push({ type: "REPORT_GENERATED", date: iv.report.createdAt, description: `Evaluation report generated for '${iv.title}'` });
            }
        }
        // Sort descending
        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        // Activity Timeline
        const activities = await database_1.prisma.candidateActivity.findMany({
            where: { candidateId: id },
            orderBy: { createdAt: "desc" }
        });
        for (const act of activities) {
            timeline.push({
                type: act.type,
                date: act.createdAt,
                description: act.description
            });
        }
        if (candidate.decisionAt) {
            timeline.push({
                type: "DECISION",
                date: candidate.decisionAt,
                description: `Candidate was ${candidate.stage}`
            });
        }
        // Re-sort ascending initially to fix order after injecting, then descending again
        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
            candidate,
            metrics: {
                totalInterviews,
                averageScore,
                highestScore,
                latestScore: latestReport?.overallScore || null,
                latestRecommendation: latestReport?.recommendation || null,
                latestInterviewDate,
            },
            timeline,
        };
    }
    async updateCandidate(id, userId, data) {
        const candidate = await repo.findById(id);
        if (!candidate)
            throw new errors_1.AppError("Candidate not found", 404);
        await this.assertMember(candidate.organizationId, userId);
        if (data.email && data.email !== candidate.email) {
            const existing = await repo.findByEmail(candidate.organizationId, data.email);
            if (existing)
                throw new errors_1.AppError("A candidate with this email already exists in this organization", 400);
        }
        return repo.update(id, data);
    }
    async deleteCandidate(id, userId) {
        const candidate = await repo.findById(id);
        if (!candidate)
            throw new errors_1.AppError("Candidate not found", 404);
        await this.assertMember(candidate.organizationId, userId);
        if (candidate.interviews.length > 0) {
            throw new errors_1.AppError("Candidate cannot be deleted because interview history exists.", 400);
        }
        return repo.delete(id);
    }
    async linkToInterview(interviewId, candidateId, userId) {
        const candidate = await repo.findById(candidateId);
        if (!candidate)
            throw new errors_1.AppError("Candidate not found", 404);
        await this.assertMember(candidate.organizationId, userId);
        const interview = await interviewRepo.findById(interviewId);
        if (!interview)
            throw new errors_1.AppError("Interview not found", 404);
        if (interview.organizationId !== candidate.organizationId) {
            throw new errors_1.AppError("Interview and candidate must belong to the same organization", 400);
        }
        return interviewRepo.update(interviewId, {
            candidateId,
        });
    }
    async moveCandidateStage(candidateId, stage, userId) {
        const candidate = await repo.findById(candidateId);
        if (!candidate)
            throw new errors_1.AppError("Candidate not found", 404);
        await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN"]);
        if (candidate.stage === "HIRED" || candidate.stage === "REJECTED") {
            throw new errors_1.AppError("Candidate decision has been finalized.", 409);
        }
        // Basic transition check (can't move backwards)
        const stageOrder = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "HIRED", "REJECTED"];
        if (stageOrder.indexOf(stage) <= stageOrder.indexOf(candidate.stage) && stage !== "REJECTED") {
            throw new errors_1.AppError("Invalid stage transition. Cannot move backwards.", 400);
        }
        // @ts-ignore
        await database_1.prisma.candidateActivity.create({
            data: {
                candidateId,
                type: "STAGE_CHANGE",
                description: `Moved to ${stage.charAt(0) + stage.slice(1).toLowerCase()}`,
            }
        });
        return repo.update(candidateId, { stage });
    }
    async makeHiringDecision(candidateId, decision, notes, userId) {
        if (decision !== "HIRED" && decision !== "REJECTED") {
            throw new errors_1.AppError("Invalid decision. Must be 'HIRED' or 'REJECTED'.", 400);
        }
        const candidate = await repo.findById(candidateId);
        if (!candidate)
            throw new errors_1.AppError("Candidate not found", 404);
        await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN"]);
        if (candidate.stage === "HIRED" || candidate.stage === "REJECTED") {
            throw new errors_1.AppError("Candidate decision has been finalized.", 409);
        }
        // @ts-ignore
        await database_1.prisma.candidateActivity.create({
            data: {
                candidateId,
                type: "DECISION",
                description: `Candidate was ${decision}`,
            }
        });
        return repo.update(candidateId, {
            // @ts-ignore
            stage: decision,
            decisionNotes: notes,
            decisionBy: { connect: { id: userId } },
            decisionAt: new Date(),
        });
    }
    async exportCandidatesCSV(organizationId, userId) {
        await this.assertMember(organizationId, userId);
        const candidates = await repo.findByOrg(organizationId);
        if (candidates.length === 0)
            return "Name,Email,Stage,Score\n";
        const header = "Name,Email,Phone,Stage,Average Score,Highest Score,Created At,Latest Recommendation\n";
        const rows = candidates.map((candidate) => {
            const reports = candidate.interviews
                .map((iv) => iv.report)
                .filter(Boolean);
            const scores = reports.map((r) => r.overallScore);
            const highestScore = scores.length > 0 ? Math.max(...scores) : "";
            const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "";
            const latestRecommendation = reports[0]?.recommendation || "";
            return `"${candidate.name}","${candidate.email}","${candidate.phone || ""}","${candidate.stage}","${averageScore}","${highestScore}","${candidate.createdAt.toISOString()}","${latestRecommendation}"`;
        });
        return header + rows.join("\n");
    }
}
exports.CandidateService = CandidateService;
