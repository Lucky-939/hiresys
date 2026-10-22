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

  if (!org) throw new Error("Org not found");

  const ownerMember = org.members.find(m => m.role === "OWNER");
  if (!ownerMember) throw new Error("No owner found for org");

  const token = jwt.sign(
    { sub: ownerMember.userId },
    process.env.JWT_SECRET || 'luckybhoirrandomjwtsecretkeyforinterviewplatform'
  );

  const headers = { 
    Authorization: `Bearer ${token}`,
    'x-organization-id': org.id
  };

  console.log(`Using Org ID: ${org.id}`);
  console.log(`Stages for org:`);
  org.pipelineStages.forEach(s => console.log(`- [${s.type}] ${s.name} (${s.id})`));

  console.log("\n1. Fetching dashboard stats...");
  const statsRes = await axios.get(`http://localhost:5000/api/dashboard/stats`, { headers });
  console.log(JSON.stringify(statsRes.data, null, 2));

  console.log("\n2. Fetching candidates...");
  const candidatesRes = await axios.get(`http://localhost:5000/api/candidates/org/${org.id}`, { headers });
  const firstCandidate = candidatesRes.data.data?.[0];

  if (firstCandidate) {
    console.log(`\n3. Fetching single candidate ${firstCandidate.id}...`);
    const candidateRes = await axios.get(`http://localhost:5000/api/candidates/${firstCandidate.id}`, { headers });
    console.log(JSON.stringify(candidateRes.data, null, 2));
  } else {
    console.log("No candidates found to fetch details for.");
  }
}

main().catch(console.error);
