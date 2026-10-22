import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://127.0.0.1:5000/api';

async function main() {
  console.log('=== REGRESSION TEST FOR MASS ASSIGNMENT ===');
  const runId = Date.now();

  // 1. Create Org A and Owner A
  const ownerA = await prisma.user.create({
    data: { name: 'MA Owner A', email: `ownerA_${runId}@example.com`, password: 'password', emailVerified: new Date() }
  });
  const orgA = await prisma.organization.create({
    data: { name: `MA Org A ${runId}`, slug: `ma-org-a-${runId}`, members: { create: { userId: ownerA.id, role: 'OWNER' } } }
  });
  const stageA = await prisma.pipelineStage.create({
    data: { name: 'Initial', color: '#10B981', order: 0, organizationId: orgA.id }
  });
  const candidate = await prisma.candidate.create({
    data: {
      name: 'MA Candidate',
      email: `cand_ma_${runId}@example.com`,
      organizationId: orgA.id,
      stageId: stageA.id,
      source: 'INTERNAL',
    }
  });

  const interview = await prisma.interview.create({
    data: {
      title: 'Initial Screening',
      organizationId: orgA.id,
      createdById: ownerA.id,
      candidateId: candidate.id,
    }
  });

  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-chars';
  const tokenA = jwt.sign({ sub: ownerA.id }, jwtSecret, { expiresIn: '1h' });

  let failedTests = 0;

  // Test 1: Candidate mass assignment
  console.log('\n[TEST 1] Tamper Candidate organizationId, source, createdById via PATCH /api/candidates/:id');
  try {
    await axios.patch(
      `${API_BASE}/candidates/${candidate.id}`,
      {
        name: 'Legit Name Update',
        organizationId: 'malicious-org-id',
        source: 'PUBLIC_APPLICATION',
        createdById: 'malicious-user-id'
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const refreshed = await prisma.candidate.findUnique({ where: { id: candidate.id } });
    if (refreshed?.organizationId !== orgA.id) {
      console.log('FAILURE: Candidate organizationId was overwritten via mass assignment!');
      failedTests++;
    } else if (refreshed?.source !== 'INTERNAL') {
      console.log('FAILURE: Candidate source was overwritten via mass assignment! source =', refreshed?.source);
      failedTests++;
    } else {
      console.log('PASS: Candidate mass assignment payload ignored. organizationId and source intact.');
    }
  } catch (err: any) {
    console.log('Candidate request error:', err.message);
    failedTests++;
  }

  // Test 2: Interview mass assignment
  console.log('\n[TEST 2] Tamper Interview organizationId, createdById via PATCH /api/interviews/:id');
  try {
    await axios.patch(
      `${API_BASE}/interviews/${interview.id}`,
      {
        title: 'Updated Interview Title',
        organizationId: 'malicious-org-id',
        createdById: 'malicious-user-id'
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const refreshedInt = await prisma.interview.findUnique({ where: { id: interview.id } });
    if (refreshedInt?.organizationId !== orgA.id) {
      console.log('FAILURE: Interview organizationId was overwritten via mass assignment!');
      failedTests++;
    } else if (refreshedInt?.createdById !== ownerA.id) {
      console.log('FAILURE: Interview createdById was overwritten via mass assignment!');
      failedTests++;
    } else {
      console.log('PASS: Interview mass assignment payload ignored. organizationId and createdById intact.');
    }
  } catch (err: any) {
    console.log('Interview request error:', err.message);
    failedTests++;
  }

  // Cleanup
  await prisma.interview.deleteMany({ where: { organizationId: orgA.id } });
  await prisma.candidate.deleteMany({ where: { organizationId: orgA.id } });
  await prisma.pipelineStage.deleteMany({ where: { organizationId: orgA.id } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: orgA.id } });
  await prisma.organization.deleteMany({ where: { id: orgA.id } });
  await prisma.user.deleteMany({ where: { id: ownerA.id } });
  await prisma.$disconnect();

  if (failedTests > 0) {
    console.log(`\n=== TEST SUMMARY: ${failedTests} tests failed ===`);
    process.exit(1);
  } else {
    console.log('\n=== TEST SUMMARY: All Mass Assignment tests passed! ===');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
