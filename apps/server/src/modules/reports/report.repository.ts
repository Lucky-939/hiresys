import { prisma } from "../../config/database";
import { Recommendation, Prisma } from "@prisma/client";

export class ReportRepository {
  create(data: {
    interviewId: string;
    codingScore: number;
    problemSolvingScore: number;
    technicalKnowledgeScore: number;
    overallScore: number;
    recommendation: Recommendation;
    aiSummary: string;
    strengths: string[];
    improvements: string[];
    generationTimeMs?: number;
    snapshotInterviewTitle?: string;
    snapshotCodeSubmitted?: string;
    snapshotLanguage?: string;
    snapshotQuestions?: Prisma.InputJsonValue;
    snapshotResumeScore?: number;
  }) {
    return prisma.interviewReport.create({
      data,
      include: {
        interview: {
          select: { id: true, title: true, status: true },
        },
      },
    });
  }

  findByInterviewId(interviewId: string) {
    return prisma.interviewReport.findUnique({
      where: { interviewId },
      include: {
        interview: {
          select: { id: true, title: true, status: true },
        },
      },
    });
  }
}
