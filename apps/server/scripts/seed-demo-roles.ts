import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: "Lucky Bhoir" } }
  });
  if (!org) throw new Error("Org not found");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1. Recruiter demo account
  const recruiterEmail = "recruiter-demo@test.com";
  let recruiter = await prisma.user.findUnique({ where: { email: recruiterEmail } });
  if (!recruiter) {
    recruiter = await prisma.user.create({
      data: {
        name: "Demo Recruiter",
        email: recruiterEmail,
        password: hashedPassword,
        emailVerified: new Date(),
      }
    });
  } else {
    await prisma.user.update({
      where: { id: recruiter.id },
      data: { password: hashedPassword, emailVerified: new Date() }
    });
  }

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: recruiter.id, organizationId: org.id } },
    update: { role: "RECRUITER" },
    create: { userId: recruiter.id, organizationId: org.id, role: "RECRUITER" }
  });

  // 2. Interviewer demo account
  const interviewerEmail = "interviewer-demo@test.com";
  let interviewer = await prisma.user.findUnique({ where: { email: interviewerEmail } });
  if (!interviewer) {
    interviewer = await prisma.user.create({
      data: {
        name: "Demo Interviewer",
        email: interviewerEmail,
        password: hashedPassword,
        emailVerified: new Date(),
      }
    });
  } else {
    await prisma.user.update({
      where: { id: interviewer.id },
      data: { password: hashedPassword, emailVerified: new Date() }
    });
  }

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: interviewer.id, organizationId: org.id } },
    update: { role: "INTERVIEWER" },
    create: { userId: interviewer.id, organizationId: org.id, role: "INTERVIEWER" }
  });

  console.log("DEMO ACCOUNTS READY:");
  console.log("1. Recruiter   : recruiter-demo@test.com   | Password123! | Role: RECRUITER");
  console.log("2. Interviewer : interviewer-demo@test.com | Password123! | Role: INTERVIEWER");
  console.log("3. Owner       : luckybhoir2230@gmail.com (Your existing account) | Role: OWNER");
}

main().catch(console.error).finally(() => prisma.$disconnect());
