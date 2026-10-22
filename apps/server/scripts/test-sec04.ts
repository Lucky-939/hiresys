import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://127.0.0.1:5000/api';

async function main() {
  console.log('=== REGRESSION TEST FOR SEC-04 ===');
  const runId = Date.now();

  // 1. Create Org A, Owner A, Candidate A
  const ownerA = await prisma.user.create({
    data: { name: 'SEC04 Owner A', email: `ownerA_${runId}@example.com`, password: 'password', emailVerified: new Date() }
  });
  const orgA = await prisma.organization.create({
    data: { name: `SEC04 Org A ${runId}`, slug: `sec04-org-a-${runId}`, members: { create: { userId: ownerA.id, role: 'OWNER' } } }
  });
  const stageA = await prisma.pipelineStage.create({
    data: { name: 'Applied', color: '#10B981', order: 0, organizationId: orgA.id }
  });
  const candidateA = await prisma.candidate.create({
    data: {
      name: 'Candidate A',
      email: `candA_${runId}@example.com`,
      organizationId: orgA.id,
      stageId: stageA.id,
    }
  });

  // 2. Create Org B, Owner B
  const ownerB = await prisma.user.create({
    data: { name: 'SEC04 Owner B', email: `ownerB_${runId}@example.com`, password: 'password', emailVerified: new Date() }
  });
  const orgB = await prisma.organization.create({
    data: { name: `SEC04 Org B ${runId}`, slug: `sec04-org-b-${runId}`, members: { create: { userId: ownerB.id, role: 'OWNER' } } }
  });

  // 3. Create a User with CANDIDATE role in Org A
  const candidateUser = await prisma.user.create({
    data: { name: 'Cand User A', email: `candUserA_${runId}@example.com`, password: 'password', emailVerified: new Date() }
  });
  await prisma.organizationMember.create({
    data: { userId: candidateUser.id, organizationId: orgA.id, role: 'CANDIDATE' }
  });

  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-chars';
  const tokenOwnerB = jwt.sign({ sub: ownerB.id }, jwtSecret, { expiresIn: '1h' });
  const tokenCandidate = jwt.sign({ sub: candidateUser.id }, jwtSecret, { expiresIn: '1h' });

  // Minimal valid PDF buffer for testing: %PDF-1.4 ... %%EOF
  const dummyPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 120 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(This is a test resume content with more than fifty characters to pass length check cleanly for candidate evaluation testing.) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000281 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n450\n%%EOF'
  );

  let failedTests = 0;

  // Test 1: User from Org B attempts to analyze resume specifying Candidate A from Org A
  console.log('\n[TEST 1] User from Org B calls POST /api/ai/resume with candidateId belonging to Org A');
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('candidateId', candidateA.id);
    form.append('resume', dummyPdf, { filename: 'test.pdf', contentType: 'application/pdf' });

    const res = await axios.post(`${API_BASE}/ai/resume`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${tokenOwnerB}`,
      }
    });
    console.log('UNEXPECTED SUCCESS (IDOR Vulnerability Present): Org B user analyzed Org A candidate resume! Status:', res.status, res.data);
    failedTests++;
  } catch (err: any) {
    if (err.response && (err.response.status === 400 || err.response.status === 403 || err.response.status === 404)) {
      console.log('EXPECTED REJECTION: Server rejected cross-org candidate resume analysis with status:', err.response.status, err.response.data);
    } else {
      console.log('UNEXPECTED ERROR:', err.message, err.response?.data);
      failedTests++;
    }
  }

  // Test 2: User with CANDIDATE role attempts to call POST /api/ai/resume
  console.log('\n[TEST 2] User with CANDIDATE role calls POST /api/ai/resume');
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('candidateId', candidateA.id);
    form.append('resume', dummyPdf, { filename: 'test.pdf', contentType: 'application/pdf' });

    const res = await axios.post(`${API_BASE}/ai/resume`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${tokenCandidate}`,
      }
    });
    console.log('UNEXPECTED SUCCESS (RBAC Vulnerability Present): Candidate token accessed /api/ai/resume! Status:', res.status);
    failedTests++;
  } catch (err: any) {
    if (err.response && (err.response.status === 403 || err.response.status === 400)) {
      console.log('EXPECTED REJECTION: Server rejected candidate role with status:', err.response.status, err.response.data);
    } else {
      console.log('UNEXPECTED ERROR:', err.message, err.response?.data);
      failedTests++;
    }
  }

  // Cleanup
  await prisma.candidateActivity.deleteMany({ where: { candidateId: candidateA.id } });
  await prisma.candidate.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.pipelineStage.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerA.id, ownerB.id, candidateUser.id] } } });
  await prisma.$disconnect();

  if (failedTests > 0) {
    console.log(`\n=== TEST SUMMARY: ${failedTests} tests failed (Vulnerabilities Confirmed) ===`);
    process.exit(1);
  } else {
    console.log('\n=== TEST SUMMARY: All SEC-04 tests passed! ===');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
