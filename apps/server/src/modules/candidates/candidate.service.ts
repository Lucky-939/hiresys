import { sendOutcomeEmail, maskEmail } from "../../utils/email";
import { redis } from "../../config/redis";
import { CandidateRepository } from "./candidate.repository";
import { OrgRepository } from "../organizations/org.repository";
import { InterviewRepository } from "../interviews/interview.repository";
import { AppError } from "../../utils/errors";
import { prisma } from "../../config/database";

import { assertTeamMember } from "../../utils/rbac";

const repo = new CandidateRepository();
const orgRepo = new OrgRepository();
const interviewRepo = new InterviewRepository();

export class CandidateService {
  private async assertRole(organizationId: string, userId: string, allowedRoles: string[]) {
    const member = await assertTeamMember(organizationId, userId);
    if (!allowedRoles.includes(member.role)) {
      throw new AppError("Insufficient permissions. Action requires: " + allowedRoles.join(", "), 403);
    }
    return member;
  }

  async createCandidate(data: {
    name: string;
    email: string;
    phone?: string;
    linkedinUrl?: string;
    stageId?: string;
    resumeText?: string;
    resumeScore?: number;
    atsScore?: number;
    jobId?: string;
    organizationId: string;
    userId: string;
  }) {
    await this.assertRole(data.organizationId, data.userId, ["OWNER", "ADMIN", "RECRUITER"]);

    const existing = await repo.findByEmail(data.organizationId, data.email);
    if (existing) {
      throw new AppError("A candidate with this email already exists in this organization", 400);
    }

    let assignedStageId = data.stageId;
    if (!assignedStageId) {
      const firstStage = await prisma.pipelineStage.findFirst({
        where: { organizationId: data.organizationId },
        orderBy: { order: 'asc' }
      });
      if (firstStage) assignedStageId = firstStage.id;
    }

    if (!assignedStageId) {
       throw new AppError("Organization has no pipeline stages configured.", 400);
    }

    // 4. Create the Candidate CRM record
    return repo.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      linkedinUrl: data.linkedinUrl,
      pipelineStage: { connect: { id: assignedStageId } },
      resumeText: data.resumeText,
      resumeScore: data.resumeScore,
      atsScore: data.atsScore,
      ...(data.jobId ? { job: { connect: { id: data.jobId } } } : {}),
      organization: { connect: { id: data.organizationId } },
      createdBy: { connect: { id: data.userId } },
    });
  }

  async getCandidatesByOrg(organizationId: string, userId: string) {
    await this.assertRole(organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);
    const candidates = await repo.findByOrg(organizationId);

    return candidates.map((candidate) => {
      const reports = candidate.interviews
        .map((iv) => iv.report)
        .filter(Boolean) as { overallScore: number; recommendation: string }[];

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

  async getCandidateById(id: string, userId: string) {
    const candidate = await repo.findById(id);
    if (!candidate) throw new AppError("Candidate not found", 404);
    await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);

    const reports = candidate.interviews
      .map((iv) => iv.report)
      .filter(Boolean) as { overallScore: number; recommendation: string }[];

    const totalInterviews = candidate.interviews.length;
    const scores = reports.map((r) => r.overallScore);
    const highestScore = scores.length > 0 ? Math.max(...scores) : null;
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    
    const latestReport = reports[0]; // because we ordered by desc in repo
    const latestInterviewDate = candidate.interviews[0]?.createdAt || null;

    // Timeline Events
    const timeline = [];
    timeline.push({ type: "CANDIDATE_CREATED", date: candidate.createdAt, description: "Candidate profile created" });
    


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
    const activities = await prisma.candidateActivity.findMany({
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
        description: `Candidate decision finalized`
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

  async updateCandidate(id: string, userId: string, data: any) {
    const candidate = await repo.findById(id);
    if (!candidate) throw new AppError("Candidate not found", 404);
    await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);

    if (data.email && data.email !== candidate.email) {
      const existing = await repo.findByEmail(candidate.organizationId, data.email);
      if (existing) throw new AppError("A candidate with this email already exists in this organization", 400);
    }

    // Mass-assignment protection: explicitly whitelist update fields
    const safeData: any = {};
    if (data.name !== undefined) safeData.name = data.name;
    if (data.email !== undefined) safeData.email = data.email;
    if (data.phone !== undefined) safeData.phone = data.phone;
    if (data.linkedinUrl !== undefined) safeData.linkedinUrl = data.linkedinUrl;
    if (data.resumeScore !== undefined) safeData.resumeScore = data.resumeScore;
    if (data.atsScore !== undefined) safeData.atsScore = data.atsScore;
    if (data.resumeText !== undefined) safeData.resumeText = data.resumeText;

    return repo.update(id, safeData);
  }

  async deleteCandidate(id: string, userId: string) {
    const candidate = await repo.findById(id);
    if (!candidate) throw new AppError("Candidate not found", 404);
    await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN"]);

    if (candidate.interviews.length > 0) {
      throw new AppError("Candidate cannot be deleted because interview history exists.", 400);
    }

    return repo.delete(id);
  }

  async linkToInterview(interviewId: string, candidateId: string, userId: string) {
    const candidate = await repo.findById(candidateId);
    if (!candidate) throw new AppError("Candidate not found", 404);
    await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);

    const interview = await interviewRepo.findById(interviewId);
    if (!interview) throw new AppError("Interview not found", 404);
    if (interview.organizationId !== candidate.organizationId) {
      throw new AppError("Interview and candidate must belong to the same organization", 400);
    }

    return interviewRepo.update(interviewId, {
      candidateId,
    });
  }

  async moveCandidateStage(candidateId: string, stageId: string, userId: string) {
    const targetStage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
    if (!targetStage) throw new AppError("Invalid stage ID", 400);

    const candidate = await repo.findById(candidateId);
    if (!candidate) throw new AppError("Candidate not found", 404);
    
    await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);

    // @ts-ignore - repository returns pipelineStage
    const currentStage = candidate.pipelineStage;

    if (currentStage?.type === "POSITIVE_TERMINAL" || currentStage?.type === "NEGATIVE_TERMINAL") {
      throw new AppError("Candidate decision has been finalized.", 409);
    }

    // Allow recruiters to move candidates flexibly across stages
    // Log the stage transition activity
    // @ts-ignore
    await prisma.candidateActivity.create({
      data: {
        candidateId,
        type: "STAGE_CHANGE",
        description: `Moved to ${targetStage.name}`,
      }
    });

    return repo.update(candidateId, { pipelineStage: { connect: { id: stageId } } });
  }

  async makeHiringDecision(candidateId: string, decision: string, notes: string, userId: string) {
    if (decision !== "HIRED" && decision !== "REJECTED") {
      throw new AppError("Invalid decision. Must be 'HIRED' or 'REJECTED'.", 400);
    }
    
    const candidate = await repo.findById(candidateId);
    if (!candidate) throw new AppError("Candidate not found", 404);
    
    await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);

    // @ts-ignore - repository returns pipelineStage
    const currentStage = candidate.pipelineStage;
    if (currentStage?.type === "POSITIVE_TERMINAL" || currentStage?.type === "NEGATIVE_TERMINAL") {
      throw new AppError("Candidate decision has been finalized.", 409);
    }

    // @ts-ignore
    await prisma.candidateActivity.create({
      data: {
        candidateId,
        type: "DECISION",
        description: `Candidate was ${decision}`,
      }
    });

    // Find the appropriate terminal stage
    const stageType = decision === "HIRED" ? "POSITIVE_TERMINAL" : "NEGATIVE_TERMINAL";
    const terminalStage = await prisma.pipelineStage.findFirst({
      where: { organizationId: candidate.organizationId, type: stageType }
    });

    if (!terminalStage) {
      throw new AppError(`Organization has no ${decision} stage configured.`, 400);
    }

    return repo.update(candidateId, {
      pipelineStage: { connect: { id: terminalStage.id } },
      decisionNotes: notes,
      decisionBy: { connect: { id: userId } },
      decisionAt: new Date(),
    });
  }

  async exportCandidatesCSV(organizationId: string, userId: string): Promise<string> {
    await this.assertRole(organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);
    const candidates = await repo.findByOrg(organizationId);
    
    if (candidates.length === 0) return "Name,Email,Stage,Score\n";
    
    const header = "Name,Email,Phone,Stage,Average Score,Highest Score,Created At,Latest Recommendation\n";
    const rows = candidates.map((candidate) => {
      const reports = candidate.interviews
        .map((iv) => iv.report)
        .filter(Boolean) as { overallScore: number; recommendation: string }[];
        
      const scores = reports.map((r) => r.overallScore);
      const highestScore = scores.length > 0 ? Math.max(...scores) : "";
      const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "";
      const latestRecommendation = reports[0]?.recommendation || "";

      const stageName = (candidate as any).pipelineStage?.name || "Unknown";
      return `"${candidate.name}","${candidate.email}","${candidate.phone || ""}","${stageName}","${averageScore}","${highestScore}","${candidate.createdAt.toISOString()}","${latestRecommendation}"`;
    });

    return header + rows.join("\n");
  }

  async sendOutcomeEmail(
    candidateId: string,
    userId: string,
    data: {
      templateType?: string;
      subject: string;
      message: string;
    }
  ) {
    if (!data.subject || typeof data.subject !== "string" || !data.subject.trim()) {
      throw new AppError("Subject is required.", 400);
    }
    if (!data.message || typeof data.message !== "string" || !data.message.trim()) {
      throw new AppError("Message body is required.", 400);
    }

    const candidate = await repo.findById(candidateId);
    if (!candidate) throw new AppError("Candidate not found", 404);

    // 1. RBAC check: only OWNER, ADMIN, RECRUITER can send outcome emails
    await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);

    // 2. Fetch org and recruiter
    const org = await orgRepo.findById(candidate.organizationId);
    if (!org) throw new AppError("Organization not found", 404);

    const recruiter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const recruiterName = recruiter?.name || recruiter?.email || "Recruiter";

    // 3. Hourly rate limit per candidate per job (1 outcome email per candidate per job per hour)
    const jobIdKey = candidate.jobId || "general";
    const rateLimitKey = `ratelimit:outcome_email:${candidateId}:${jobIdKey}`;
    
    const attempts = await redis.incr(rateLimitKey);
    if (attempts === 1) {
      await redis.expire(rateLimitKey, 3600); // 1 hour TTL
    }
    if (attempts > 1) {
      throw new AppError("Rate limit exceeded: only one outcome email per candidate per job is allowed per hour.", 429);
    }

    // 4. Send the outcome email
    try {
      await sendOutcomeEmail({
        to: candidate.email,
        candidateName: candidate.name,
        jobTitle: candidate.job?.title || null,
        orgName: org.name,
        subject: data.subject.trim(),
        message: data.message.trim(),
      });
    } catch (err: any) {
      // Clear rate limit so the recruiter can retry
      await redis.del(rateLimitKey);
      console.error(`[Email Service] Failed to send outcome email to ${maskEmail(candidate.email)}:`, err?.message || err);
      throw new AppError("Failed to send outcome email. Please try again.", 500);
    }

    // 5. Log in candidate timeline without storing the full email body
    await prisma.candidateActivity.create({
      data: {
        candidateId,
        type: "OUTCOME_EMAIL_SENT",
        description: `Outcome email sent by ${recruiterName}`,
      },
    });

    return { success: true, message: "Outcome email sent successfully" };
  }

}
