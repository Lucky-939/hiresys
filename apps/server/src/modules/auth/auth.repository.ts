import { prisma } from "../../config/database";
import { DEFAULT_PIPELINE_STAGES } from "../stages/stage.constants";

export class AuthRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async createUser(data: { name: string; email: string; password: string; organizationName?: string }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: data.password,
        },
      });

      const orgName = data.organizationName?.trim();
      if (orgName) {
        let baseSlug = orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (!baseSlug) baseSlug = "org";
        const orgSlug = `${baseSlug}-${user.id.slice(-6)}`;

        const org = await tx.organization.create({
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

        await tx.pipelineStage.createMany({
          data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
            ...stage,
            organizationId: org.id,
          })),
        });
      }

      return user;
    });
  }
}

