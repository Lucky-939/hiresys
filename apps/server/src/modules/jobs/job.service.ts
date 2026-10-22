import { JobRepository } from "./job.repository";
import { AppError } from "../../utils/errors";
import { assertTeamMember } from "../../utils/rbac";
import { JobStatus } from "@prisma/client";

const repo = new JobRepository();

export class JobService {
  private async assertRole(organizationId: string, userId: string, allowedRoles: string[]) {
    const member = await assertTeamMember(organizationId, userId);
    if (!allowedRoles.includes(member.role)) {
      throw new AppError("Insufficient permissions. Action requires: " + allowedRoles.join(", "), 403);
    }
    return member;
  }

  async createJob(organizationId: string, userId: string, data: {
    title: string;
    description: string;
    department?: string;
    location?: string;
  }) {
    await this.assertRole(organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);
    return repo.create({
      title: data.title,
      description: data.description,
      department: data.department,
      location: data.location,
      organizationId,
      createdById: userId,
      status: (data as any).status || "DRAFT",
    });
  }

  async getJobsByOrg(organizationId: string, userId: string) {
    await this.assertRole(organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);
    return repo.findByOrg(organizationId);
  }

  async getJobById(id: string, userId: string) {
    const job = await repo.findById(id);
    if (!job) throw new AppError("Job not found", 404);
    await this.assertRole(job.organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);
    return job;
  }

  async updateJob(id: string, userId: string, data: Partial<{
    title: string;
    description: string;
    department: string;
    location: string;
    status: JobStatus;
  }>) {
    const job = await repo.findById(id);
    if (!job) throw new AppError("Job not found", 404);
    await this.assertRole(job.organizationId, userId, ["OWNER", "ADMIN", "RECRUITER"]);

    // Closed jobs stay permanently closed as decided
    if (job.status === "CLOSED" && data.status && data.status !== "CLOSED") {
      throw new AppError("Closed jobs cannot be reopened.", 400);
    }

    const safeData: any = {};
    if (data.title !== undefined) safeData.title = data.title;
    if (data.description !== undefined) safeData.description = data.description;
    if (data.department !== undefined) safeData.department = data.department;
    if (data.location !== undefined) safeData.location = data.location;
    if (data.status !== undefined) safeData.status = data.status;

    return repo.update(id, safeData);
  }

  async deleteJob(id: string, userId: string) {
    const job = await repo.findById(id);
    if (!job) throw new AppError("Job not found", 404);
    await this.assertRole(job.organizationId, userId, ["OWNER", "ADMIN"]);
    
    if (job._count.candidates > 0) {
      throw new AppError("Cannot delete a job that has candidates associated with it. Please close it instead.", 400);
    }
    
    return repo.delete(id);
  }
}
