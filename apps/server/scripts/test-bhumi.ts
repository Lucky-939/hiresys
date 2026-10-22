import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { CandidateService } from "../src/modules/candidates/candidate.service";

const prisma = new PrismaClient();
const candidateService = new CandidateService();

async function check() {
  const c = await prisma.candidate.findFirst({
    where: { email: "musalebhumi44@gmail.com" },
    include: { job: true, pipelineStage: true }
  });
  console.log("Candidate found:", c?.id, c?.name, "OrgId:", c?.organizationId);

  const recruiter = await prisma.user.findUnique({
    where: { email: "recruiter-demo@test.com" }
  });
  console.log("Recruiter found:", recruiter?.id, recruiter?.email);

  if (c && recruiter) {
    try {
      console.log("Calling candidateService.sendOutcomeEmail...");
      const res = await candidateService.sendOutcomeEmail(c.id, recruiter.id, {
        subject: "Test Subject for Bhumi",
        message: "Test message for Bhumi."
      });
      console.log("Success:", res);
    } catch (err: any) {
      console.error("FAILED WITH ERROR:", err.message);
      console.error("Status code:", err.statusCode);
      console.error("Stack:", err.stack);
    }
  }
}

check().finally(() => prisma.$disconnect());
