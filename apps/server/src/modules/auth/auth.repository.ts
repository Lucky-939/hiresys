import { prisma } from "../../config/database";

export class AuthRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  createUser(data: { name: string; email: string; password: string }) {
    return prisma.user.create({ data });
  }
}
