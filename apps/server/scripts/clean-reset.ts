import { prisma } from "../src/config/database";
import { redis } from "../src/config/redis";

async function cleanReset() {
  console.log("Wiping database and redis for clean first-user experience...");
  await prisma.notification.deleteMany();
  await prisma.interviewReport.deleteMany();
  await prisma.candidateActivity.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.orgInvite.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  await redis.flushall();
  console.log("Clean reset complete: Database and Redis are wiped 100%.");
  process.exit(0);
}

cleanReset().catch((err) => {
  console.error("Clean reset error:", err);
  process.exit(1);
});
