import { prisma } from "../config/database";
import { AppError } from "./errors";

export async function assertTeamMember(organizationId: string, userId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!member) {
    throw new AppError("Access denied: You are not a member of this organization", 403);
  }

  if (member.role === "CANDIDATE") {
    throw new AppError("Access denied: Candidates cannot access this resource", 403);
  }

  return member;
}

export async function assertOrgMember(organizationId: string, userId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!member) {
    throw new AppError("Access denied: You are not a member of this organization", 403);
  }

  return member;
}
