import { prisma } from "../../config/database";
import { JobStatus } from "@prisma/client";

export class JobRepository {
  async create(data: {
    title: string;
    description: string;
    department?: string;
    location?: string;
    status?: JobStatus;
    organizationId: string;
    createdById: string;
  }) {
    return prisma.job.create({
      data: {
        title: data.title,
        description: data.description,
        department: data.department,
        location: data.location,
        status: data.status || "DRAFT",
        organization: { connect: { id: data.organizationId } },
        createdBy: { connect: { id: data.createdById } }
      }
    });
  }

  async findByOrg(organizationId: string) {
    return prisma.job.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { candidates: true }
        }
      }
    });
  }

  async findById(id: string) {
    return prisma.job.findUnique({
      where: { id },
      include: {
        _count: {
          select: { candidates: true }
        }
      }
    });
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    department: string;
    location: string;
    status: JobStatus;
  }>) {
    return prisma.job.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.job.delete({
      where: { id }
    });
  }
}