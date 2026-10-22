import { prisma } from "../../config/database";
import { InterviewStatus } from "@prisma/client";

export class InterviewRepository {
  async create(data: {
    title: string;
    description?: string;
    scheduledAt?: Date;
    organizationId: string;
    createdById: string;
    candidateId?: string;
    interviewerId?: string;
  }) {
    const interview = await prisma.interview.create({
      data,
      include: { 
        createdBy: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true, email: true } }
      },
    });

    if (data.candidateId) {
      // Find a stage named "Interviewing" or similar
      const interviewStage = await prisma.pipelineStage.findFirst({
        where: {
          organizationId: data.organizationId,
          name: { equals: "Interviewing", mode: "insensitive" }
        }
      });
      if (interviewStage) {
        await prisma.candidate.update({
          where: { id: data.candidateId },
          data: { stageId: interviewStage.id }
        });
      }
    }

    return interview;
  }

  findByOrg(organizationId: string) {
    return prisma.interview.findMany({
      where: { organizationId },
      include: { 
        createdBy: { select: { id: true, name: true } },
        candidate: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return prisma.interview.findUnique({
      where: { id },
      include: { 
        createdBy: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true, email: true } },
        report: true
      },
    });
  }

  update(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: InterviewStatus;
      scheduledAt?: Date;
      candidateId?: string | null;
      codeSubmitted?: string;
      language?: string;
      interviewNotes?: string;
      interviewerId?: string | null;
      candidateInviteSentAt?: Date | null;
      interviewerInviteSentAt?: Date | null;
      candidateInviteFailed?: boolean;
      interviewerInviteFailed?: boolean;
      needsPasswordReset?: boolean;
    },
  ) {
    return prisma.interview.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true, email: true } },
        report: true,
      },
    });
  }

  delete(id: string) {
    return prisma.interview.delete({ where: { id } });
  }
}
