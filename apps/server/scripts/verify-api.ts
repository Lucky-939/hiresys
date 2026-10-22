import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';



async function main() {
  console.log("=== API VERIFICATION SCRIPT START ===");
  
  console.log("\n[Setup] Creating accounts...");
  const r = Date.now();
  const owner = await prisma.user.create({ data: { name: "Owner VTest", email: `owner-${r}@test.com`, password: "pwd" } });
  const interviewer = await prisma.user.create({ data: { name: "Interviewer VTest", email: `interviewer-${r}@test.com`, password: "pwd" } });
  
  console.log("[Setup] Creating org...");
  const org = await prisma.organization.create({
    data: { name: "VTest Org", slug: "vtest-org-" + Date.now(), members: { create: [
      { userId: owner.id, role: "OWNER" },
      { userId: interviewer.id, role: "INTERVIEWER" }
    ]}}
  });
  
  console.log("\n[Setup] Generating candidate and interviews...");
  const candidateUser = await prisma.user.create({ data: { name: "Candidate VTest", email: `candidate-${r}@test.com`, password: "pwd" } });
  
  await prisma.organizationMember.create({
    data: { userId: candidateUser.id, organizationId: org.id, role: "CANDIDATE" }
  });
  
  const interviewAssigned = await prisma.interview.create({
    data: { 
      title: "Assigned Interview", 
      organizationId: org.id, 
      createdById: owner.id, 
      interviewerId: interviewer.id, 
      interviewNotes: "These are highly confidential interviewer notes.",
      report: {
        create: {
          codingScore: 80,
          problemSolvingScore: 85,
          technicalKnowledgeScore: 75,
          overallScore: 80,
          recommendation: "STRONG_HIRE",
          aiSummary: "Great candidate.",
          strengths: ["Strong problem solving"],
          improvements: ["Communication"]
        }
      }
    }
  });
  
  const interviewUnassigned = await prisma.interview.create({
    data: { title: "Unassigned Interview", organizationId: org.id, createdById: owner.id, interviewerId: null }
  });

  await prisma.interview.update({
    where: { id: interviewAssigned.id },
    data: { 
      candidate: { create: { name: "Candidate VTest", email: `candidate-${r}@test.com`, organizationId: org.id, createdById: owner.id } }
    }
  });

  const ownerToken = jwt.sign({ sub: owner.id }, process.env.JWT_SECRET || 'luckybhoirrandomjwtsecretkeyforinterviewplatform');
  const interviewerToken = jwt.sign({ sub: interviewer.id }, process.env.JWT_SECRET || 'luckybhoirrandomjwtsecretkeyforinterviewplatform');
  const candidateToken = jwt.sign({ sub: candidateUser.id }, process.env.JWT_SECRET || 'luckybhoirrandomjwtsecretkeyforinterviewplatform');

  async function api(path: string, token: string) {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-organization-id': org.id
      }
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  console.log("\n=== STEP 7: CANDIDATE DATA SCRUBBING (SIDE-BY-SIDE) ===");
  console.log(`-> As INTERVIEWER, hitting assigned interview (${interviewAssigned.id})...`);
  const intViewRes = await api(`/interviews/${interviewAssigned.id}`, interviewerToken);
  console.log(`Status: ${intViewRes.status}`);
  console.log(`Notes seen by Interviewer: "${intViewRes.data?.data?.interviewNotes}"`);
  console.log(`Report seen by Interviewer: ${JSON.stringify(intViewRes.data?.data?.report)}`);

  console.log(`\n-> As CANDIDATE, hitting assigned interview (${interviewAssigned.id})...`);
  const candViewRes = await api(`/interviews/${interviewAssigned.id}`, candidateToken);
  console.log(`Status: ${candViewRes.status}`);
  console.log(`Notes seen by Candidate: ${candViewRes.data?.data?.interviewNotes}`);
  console.log(`Report seen by Candidate: ${JSON.stringify(candViewRes.data?.data?.report)}`);
  
  console.log("\n=== STEP 8: ORG SETTINGS MANAGEMENT (INTERVIEWER) ===");
  console.log(`-> As INTERVIEWER, attempting to rename the org via PATCH /organizations/${org.id}...`);
  const renameRes = await fetch(`${API_URL}/organizations/${org.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${interviewerToken}`, 'x-organization-id': org.id },
    body: JSON.stringify({ name: "Hacked Org Name" })
  });
  const renameData = await renameRes.json().catch(() => null);
  console.log(`Status: ${renameRes.status}`);
  console.log(`Response: ${JSON.stringify(renameData)}`);

  console.log("\n=== STEP 9: ORG CREATION (INTERVIEWER ACCOUNT) ===");
  console.log(`-> As INTERVIEWER, attempting to create a brand new org via POST /organizations...`);
  const createRes = await fetch(`${API_URL}/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${interviewerToken}` },
    body: JSON.stringify({ name: "My Own Startup" })
  });
  const createData = await createRes.json().catch(() => null);
  console.log(`Status: ${createRes.status}`);
  console.log(`Response (Success=${createData?.success}): Created Org ID ${createData?.data?.id}`);
  
  console.log("\n=== API VERIFICATION SCRIPT END ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
