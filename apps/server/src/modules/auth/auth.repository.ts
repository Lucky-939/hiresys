import { prisma } from "../../config/database";

export class AuthRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async createUser(data: { name: string; email: string; password: string }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });

      const orgName = `${data.name}'s Org`;
      const orgSlug = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${user.id.slice(-6)}`;

      await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });

      return user;
    });
  }
}
