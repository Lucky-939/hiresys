import { CandidateRepository } from "./candidate.repository";
import { OrgRepository } from "../organizations/org.repository";
import { InterviewRepository } from "../interviews/interview.repository";
import { AppError } from "../../utils/errors";
import { CandidateStage } from "@prisma/client";
import { prisma } from "../../config/database";

const repo = new CandidateRepository();
const orgRepo = new OrgRepository();
const interviewRepo = new InterviewRepository();

export class CandidateService {
  private async assertMember(organizationId: string, userId: string) {
    const org = await orgRepo.findById(organizationId);
    if (!org) throw new AppError("Organization not found", 404);
    const member = org.members.find((m) => m.userId === userId);
    if (!member) throw new AppError("Access denied", 403);
    return member;
  }

  private async assertRole(organizationId: string, userId: string, allowedRoles: string[]) {
    const member = await this.assertMember(organizationId, userId);
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
    stage?: CandidateStage;
    resumeText?: string;
    resumeScore?: number;
    atsScore?: number;
    organizationId: string;
    userId: string;
  }) {
    await this.assertMember(data.organizationId, data.userId);

    const existing = await repo.findByEmail(data.organizationId, data.email);
    if (existing) {
      throw new AppError("A candidate with this email already exists in this organization", 400);
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

  async getCandidatesByOrg(organizationId: string, userId: string) {
    await this.assertMember(organizationId, userId);
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
    await this.assertMember(candidate.organizationId, userId);

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

  async updateCandidate(id: string, userId: string, data: any) {
    const candidate = await repo.findById(id);
    if (!candidate) throw new AppError("Candidate not found", 404);
    await this.assertMember(candidate.organizationId, userId);

    if (data.email && data.email !== candidate.email) {
      const existing = await repo.findByEmail(candidate.organizationId, data.email);
      if (existing) throw new AppError("A candidate with this email already exists in this organization", 400);
    }

    return repo.update(id, data);
  }

  async deleteCandidate(id: string, userId: string) {
    const candidate = await repo.findById(id);
    if (!candidate) throw new AppError("Candidate not found", 404);
    await this.assertMember(candidate.organizationId, userId);

    if (candidate.interviews.length > 0) {
      throw new AppError("Candidate cannot be deleted because interview history exists.", 400);
    }

    return repo.delete(id);
  }

  async linkToInterview(interviewId: string, candidateId: string, userId: string) {
    const candidate = await repo.findById(candidateId);
    if (!candidate) throw new AppError("Candidate not found", 404);
    await this.assertMember(candidate.organizationId, userId);

    const interview = await interviewRepo.findById(interviewId);
    if (!interview) throw new AppError("Interview not found", 404);
    if (interview.organizationId !== candidate.organizationId) {
      throw new AppError("Interview and candidate must belong to the same organization", 400);
    }

    return interviewRepo.update(interviewId, {
      candidateId,
    });
  }

  async moveCandidateStage(candidateId: string, stage: CandidateStage, userId: string) {
    const candidate = await repo.findById(candidateId);
    if (!candidate) throw new AppError("Candidate not found", 404);
    
    await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN"]);

    if (candidate.stage === "HIRED" || candidate.stage === "REJECTED") {
      throw new AppError("Candidate decision has been finalized.", 409);
    }

    // Basic transition check (can't move backwards)
    const stageOrder = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "HIRED", "REJECTED"];
    if (stageOrder.indexOf(stage) <= stageOrder.indexOf(candidate.stage) && stage !== "REJECTED") {
       throw new AppError("Invalid stage transition. Cannot move backwards.", 400);
    }

    // @ts-ignore
    await prisma.candidateActivity.create({
      data: {
        candidateId,
        type: "STAGE_CHANGE",
        description: `Moved to ${stage.charAt(0) + stage.slice(1).toLowerCase()}`,
      }
    });

    return repo.update(candidateId, { stage });
  }

  async makeHiringDecision(candidateId: string, decision: string, notes: string, userId: string) {
    if (decision !== "HIRED" && decision !== "REJECTED") {
      throw new AppError("Invalid decision. Must be 'HIRED' or 'REJECTED'.", 400);
    }
    
    const candidate = await repo.findById(candidateId);
    if (!candidate) throw new AppError("Candidate not found", 404);
    
    await this.assertRole(candidate.organizationId, userId, ["OWNER", "ADMIN"]);

    if (candidate.stage === "HIRED" || candidate.stage === "REJECTED") {
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

    return repo.update(candidateId, {
      // @ts-ignore
      stage: decision,
      decisionNotes: notes,
      decisionBy: { connect: { id: userId } },
      decisionAt: new Date(),
    });
  }

  async exportCandidatesCSV(organizationId: string, userId: string): Promise<string> {
    await this.assertMember(organizationId, userId);
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

      return `"${candidate.name}","${candidate.email}","${candidate.phone || ""}","${candidate.stage}","${averageScore}","${highestScore}","${candidate.createdAt.toISOString()}","${latestRecommendation}"`;
    });

    return header + rows.join("\n");
  }
}
