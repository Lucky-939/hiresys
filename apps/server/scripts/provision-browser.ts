import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = "interviewer-browser@test.com";
  
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hashedPassword = await bcrypt.hash("pwd", 12);
    user = await prisma.user.create({
      data: { name: "Browser Interviewer", email, password: hashedPassword, emailVerified: new Date() }
    });
  }

  let org = await prisma.organization.findFirst({ where: { name: "HireSys Browser Test Org" } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: "HireSys Browser Test Org", slug: "hiresys-browser-test-" + Date.now() }
    });
  }

  const existingMember = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } }
  });

  if (!existingMember) {
    await prisma.organizationMember.create({
      data: { userId: user.id, organizationId: org.id, role: "INTERVIEWER" }
    });
  }
  
  console.log("READY");
}

main().catch(console.error).finally(() => prisma.$disconnect());
