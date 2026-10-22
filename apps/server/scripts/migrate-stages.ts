import { PrismaClient, StageType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting stage migration...");

  // 1. Get all organizations
  const orgs = await prisma.organization.findMany();
  console.log(`Found ${orgs.length} organizations.`);

  for (const org of orgs) {
    console.log(`\nMigrating organization: ${org.name} (${org.id})`);

    // 2. Seed default stages for this organization
    const defaultStages = [
      { name: "Applied", order: 0, color: "var(--primary)", type: StageType.STANDARD },
      { name: "Screening", order: 1, color: "var(--accent)", type: StageType.STANDARD },
      { name: "Interviewing", order: 2, color: "var(--accent)", type: StageType.STANDARD },
      { name: "Offer", order: 3, color: "var(--success)", type: StageType.STANDARD },
      { name: "Hired", order: 4, color: "var(--success)", type: StageType.POSITIVE_TERMINAL },
      { name: "Rejected", order: 5, color: "var(--danger)", type: StageType.NEGATIVE_TERMINAL },
    ];

    const createdStages: Record<string, string> = {};

    for (const stage of defaultStages) {
      const created = await prisma.pipelineStage.upsert({
        where: {
          organizationId_name: {
            organizationId: org.id,
            name: stage.name,
          },
        },
        update: {},
        create: {
          name: stage.name,
          order: stage.order,
          color: stage.color,
          type: stage.type,
          organizationId: org.id,
        },
      });
      createdStages[stage.name.toUpperCase()] = created.id;
    }

    // 3. Update all candidates in this org to link to the new stages
    const candidates = await prisma.candidate.findMany({
      where: { organizationId: org.id },
    });

    console.log(`Found ${candidates.length} candidates in ${org.name}`);

    for (const candidate of candidates) {
      // @ts-ignore: mapping from enum string to the key we generated
      const stageEnumStr = candidate.stage; // APPLIED, SCREENING, etc.
      
      let mappedStageName = stageEnumStr;
      // Handle mapping "INTERVIEWING" to the created key
      if (mappedStageName === "INTERVIEWING") {
        mappedStageName = "INTERVIEWING";
      }

      const stageId = createdStages[mappedStageName];

      if (stageId) {
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { stageId },
        });
        console.log(`  -> Mapped candidate ${candidate.name} (stage: ${stageEnumStr}) to stageId: ${stageId}`);
      } else {
        console.log(`  -> WARNING: Could not map stage ${stageEnumStr} for candidate ${candidate.name}`);
      }
    }
  }

  console.log("\nMigration script complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
