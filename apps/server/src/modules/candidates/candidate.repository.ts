import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";

export class CandidateRepository {
  async create(data: Prisma.CandidateCreateInput) {
    return prisma.candidate.create({ data });
  }

  async findById(id: string) {
    return prisma.candidate.findUnique({
      where: { id },
      include: {
        interviews: {
          include: {
            report: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  async findByOrg(organizationId: string) {
    return prisma.candidate.findMany({
      where: { organizationId },
      include: {
        interviews: {
          include: {
            report: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findByEmail(organizationId: string, email: string) {
    return prisma.candidate.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    });
  }

  async update(id: string, data: Prisma.CandidateUpdateInput) {
    return prisma.candidate.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.candidate.delete({
      where: { id },
    });
  }
}
