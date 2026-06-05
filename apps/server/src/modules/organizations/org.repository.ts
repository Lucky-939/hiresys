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
}
