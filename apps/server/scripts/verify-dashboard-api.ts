import axios from "axios";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: "cmscpkwxu0004vay4sog2y1l1" },
    include: { members: true, pipelineStages: true }
  });

  if (!org) throw new Error("VPPCOE org not found");

  const ownerMember = org.members.find(m => m.role === "OWNER");
  if (!ownerMember) throw new Error("No owner found for org");

  const token = jwt.sign(
    { sub: ownerMember.userId },
    process.env.JWT_SECRET || 'luckybhoirrandomjwtsecretkeyforinterviewplatform'
  );

  const { DashboardService } = require("../src/modules/dashboard/dashboard.service");
  const service = new DashboardService();
  
  try {
    const stats = await service.getStats(org.id);
    console.log("Dashboard Stats Returned:");
    console.log(JSON.stringify(stats, null, 2));
    
    console.log("\nPipeline Counts mapping to Stage Names:");
    if (stats.pipelineCounts) {
      for (const [stageId, count] of Object.entries(stats.pipelineCounts)) {
        const stageName = org.pipelineStages.find(s => s.id === stageId)?.name || "UNKNOWN_STAGE";
        console.log(`- ${stageName} (${stageId}): ${count} candidate(s)`);
      }
    }
  } catch (e: any) {
    console.error("Service Error:", e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
