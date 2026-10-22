import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Verifying Stage Mapping for VPPCOE (cmscpkwxu0004vay4sog2y1l1)...\n");

  const candidates = await prisma.candidate.findMany({
    where: { organizationId: "cmscpkwxu0004vay4sog2y1l1" },
    include: { pipelineStage: true }
  });

  console.table(
    candidates.map(c => ({
      Candidate: c.name,
      Old_Enum: c.stage,
      New_StageId: c.stageId,
      Mapped_Stage_Name: c.pipelineStage?.name || "NULL",
      Stage_Type: c.pipelineStage?.type || "NULL",
    }))
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
