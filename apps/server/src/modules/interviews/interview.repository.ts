import { prisma } from "../../config/database";
import { InterviewStatus } from "@prisma/client";

export class InterviewRepository {
  create(data: {
    title: string;
    description?: string;
    scheduledAt?: Date;
    organizationId: string;
    createdById: string;
    candidateId?: string;
  }) {
    return prisma.interview.create({
      data,
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
  }

  findByOrg(organizationId: string) {
    return prisma.interview.findMany({
      where: { organizationId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return prisma.interview.findUnique({
      where: { id },
      include: { 
        createdBy: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } }
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
    },
  ) {
    return prisma.interview.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.interview.delete({ where: { id } });
  }
}
