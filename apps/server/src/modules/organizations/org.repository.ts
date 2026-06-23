import { prisma } from "../../config/database";

export class OrgRepository {
  create(data: { name: string; slug: string; ownerId: string }) {
    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: data.name, slug: data.slug },
      });
      await tx.organizationMember.create({
        data: {
          userId: data.ownerId,
          organizationId: org.id,
          role: "OWNER",
        },
      });
      return org;
    });
  }

  findById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });
  }

  findBySlug(slug: string) {
    return prisma.organization.findUnique({ where: { slug } });
  }

  findUserOrgs(userId: string) {
    return prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { interviews: true, members: true } } },
    });
  }

  // --- Members ---
  
  getMembers(organizationId: string) {
    return prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  getMember(organizationId: string, userId: string) {
    return prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { user: { select: { email: true } } },
    });
  }

  updateMemberRole(organizationId: string, userId: string, role: "ADMIN" | "MEMBER") {
    return prisma.organizationMember.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { role },
    });
  }

  removeMember(organizationId: string, userId: string) {
    return prisma.organizationMember.delete({
      where: { userId_organizationId: { userId, organizationId } },
    });
  }

  // --- Invites ---

  // @ts-ignore Prisma client lock
  createInvite(data: { email: string; organizationId: string; role: "ADMIN" | "MEMBER"; createdById: string; expiresAt: Date }) {
    // @ts-ignore
    return prisma.orgInvite.create({ data });
  }

  // @ts-ignore Prisma client lock
  findInviteByToken(token: string) {
    // @ts-ignore
    return prisma.orgInvite.findUnique({
      where: { token },
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  // @ts-ignore Prisma client lock
  findActiveInvite(email: string, organizationId: string) {
    // @ts-ignore
    return prisma.orgInvite.findFirst({
      where: {
        email,
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  // @ts-ignore Prisma client lock
  acceptInvite(inviteId: string, organizationId: string, userId: string, role: string) {
    return prisma.$transaction(async (tx) => {
      const existingMember = await tx.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      if (existingMember) {
        throw new Error("User is already a member of this organization");
      }

      // @ts-ignore
      await tx.orgInvite.update({
        where: { id: inviteId },
        data: { acceptedAt: new Date() },
      });

      return tx.organizationMember.create({
        data: {
          userId,
          organizationId,
          // @ts-ignore
          role,
        },
      });
    });
  }
}
