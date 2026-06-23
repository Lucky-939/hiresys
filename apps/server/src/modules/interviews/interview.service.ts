import { InterviewRepository } from "./interview.repository";
import { OrgRepository } from "../organizations/org.repository";
import { AppError } from "../../utils/errors";
import { InterviewStatus } from "@prisma/client";

const repo = new InterviewRepository();
const orgRepo = new OrgRepository();

export class InterviewService {
  private async assertMember(organizationId: string, userId: string) {
    const org = await orgRepo.findById(organizationId);
    if (!org) throw new AppError("Organization not found", 404);
    const isMember = org.members.some((m) => m.userId === userId);
    if (!isMember) throw new AppError("Access denied", 403);
  }

  async create(data: {
    title: string;
    description?: string;
    scheduledAt?: string;
    organizationId: string;
    userId: string;
    candidateId?: string;
  }) {
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

  async getByOrg(organizationId: string, userId: string) {
    await this.assertMember(organizationId, userId);
    return repo.findByOrg(organizationId);
  }

  async getById(id: string, userId: string) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);
    await this.assertMember(interview.organizationId, userId);
    return interview;
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      status?: InterviewStatus;
      scheduledAt?: string;
      candidateId?: string | null;
      codeSubmitted?: string;
      language?: string;
      interviewNotes?: string;
    },
  ) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);
    await this.assertMember(interview.organizationId, userId);

    if (interview.status === "COMPLETED") {
      throw new AppError("Completed interviews cannot be modified.", 409);
    }

    return repo.update(id, {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    });
  }

  async delete(id: string, userId: string) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);
    await this.assertMember(interview.organizationId, userId);
    return repo.delete(id);
  }
}
