import { prisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import { assertTeamMember } from "../../utils/rbac";
import { StageType } from "@prisma/client";

export class StageService {
  async getStages(organizationId: string, userId: string) {
    await assertTeamMember(organizationId, userId);
    return prisma.pipelineStage.findMany({
      where: { organizationId },
      orderBy: { order: "asc" },
    });
  }

  async createStage(organizationId: string, userId: string, data: { name: string; color: string; type?: StageType }) {
    const member = await assertTeamMember(organizationId, userId);
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      throw new AppError("Access denied", 403);
    }

    // Calculate next order
    const lastStage = await prisma.pipelineStage.findFirst({
      where: { organizationId },
      orderBy: { order: "desc" }
    });
    const order = lastStage ? lastStage.order + 1 : 0;

    return prisma.pipelineStage.create({
      data: {
        name: data.name,
        color: data.color || "#3B82F6",
        type: data.type || "STANDARD",
        order,
        organizationId,
      }
    });
  }

  async updateStage(organizationId: string, userId: string, stageId: string, data: { name?: string; color?: string; type?: StageType }) {
    const member = await assertTeamMember(organizationId, userId);
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      throw new AppError("Access denied", 403);
    }
    
    const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
    if (!stage || stage.organizationId !== organizationId) {
      throw new AppError("Stage not found", 404);
    }

    const safeData: any = {};
    if (data.name !== undefined) safeData.name = data.name;
    if (data.color !== undefined) safeData.color = data.color;
    if (data.type !== undefined) safeData.type = data.type;

    return prisma.pipelineStage.update({
      where: { id: stageId },
      data: safeData
    });
  }

  async updateStageOrders(organizationId: string, userId: string, stageOrders: { id: string, order: number }[]) {
    const member = await assertTeamMember(organizationId, userId);
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      throw new AppError("Access denied", 403);
    }

    if (!Array.isArray(stageOrders) || stageOrders.length === 0) {
      throw new AppError("stageOrders must be a non-empty array", 400);
    }

    // Verify all stage IDs belong to this organization (reject whole request if any ID is outside org)
    const stageIds = stageOrders.map(s => s.id);
    const existingStages = await prisma.pipelineStage.findMany({
      where: {
        id: { in: stageIds },
        organizationId,
      },
      select: { id: true }
    });

    if (existingStages.length !== stageIds.length) {
      throw new AppError("One or more stage IDs do not belong to this organization", 400);
    }

    const updates = stageOrders.map(({ id, order }) => 
      prisma.pipelineStage.update({
        where: { id },
        data: { order }
      })
    );

    await prisma.$transaction(updates);
    return this.getStages(organizationId, userId);
  }

  async deleteStage(organizationId: string, userId: string, stageId: string) {
    const member = await assertTeamMember(organizationId, userId);
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      throw new AppError("Access denied", 403);
    }

    const stage = await prisma.pipelineStage.findUnique({
      where: { id: stageId },
      include: { _count: { select: { candidates: true } } }
    });

    if (!stage || stage.organizationId !== organizationId) {
      throw new AppError("Stage not found", 404);
    }

    if (stage._count.candidates > 0) {
      throw new AppError("Cannot delete a stage that contains candidates", 400);
    }

    if (stage.type === "POSITIVE_TERMINAL" || stage.type === "NEGATIVE_TERMINAL") {
      const sameTypeCount = await prisma.pipelineStage.count({
        where: { organizationId, type: stage.type }
      });
      if (sameTypeCount <= 1) {
        throw new AppError(`Cannot delete the last ${stage.type} stage`, 400);
      }
    }

    await prisma.pipelineStage.delete({ where: { id: stageId } });
    return { success: true };
  }
}
