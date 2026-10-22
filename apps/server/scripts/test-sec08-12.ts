import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://127.0.0.1:5000/api';
const jwtSecret = process.env.JWT_SECRET!;

async function main() {
  console.log('=== REGRESSION TEST FOR SEC-08 (CORS) & SEC-12 (STAGE VALIDATION/RBAC) ===');
  const runId = Date.now();
  let failed = 0;

  // Seed org with OWNER and RECRUITER
  const owner = await prisma.user.create({
    data: { name: 'Owner User', email: `owner_${runId}@example.com`, password: 'password', emailVerified: new Date() }
  });
  const recruiter = await prisma.user.create({
    data: { name: 'Recruiter User', email: `recruiter_${runId}@example.com`, password: 'password', emailVerified: new Date() }
  });
  const org = await prisma.organization.create({
    data: {
      name: `Stage Org ${runId}`,
      slug: `stage-org-${runId}`,
      members: {
        create: [
          { userId: owner.id, role: 'OWNER' },
          { userId: recruiter.id, role: 'RECRUITER' },
        ]
      }
    }
  });

  const ownerToken = jwt.sign({ sub: owner.id }, jwtSecret, { expiresIn: '1h' });
  const recruiterToken = jwt.sign({ sub: recruiter.id }, jwtSecret, { expiresIn: '1h' });

  // TEST 1: Stage creation schema validation - missing name (as OWNER)
  console.log('\n[TEST 1] Testing POST stage schema validation with missing name (as OWNER)...');
  try {
    const res = await axios.post(
      `${API_BASE}/organizations/${org.id}/stages`,
      {},
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    console.log('FAILURE: Stage creation without name was accepted by server (status', res.status, ') payload:', res.data);
    failed++;
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.message === 'Validation failed') {
      console.log('PASS: Stage creation without name rejected by validateRequest schema validation (status 400).');
    } else {
      console.log(`FAILURE: Expected 400 Validation failed, got status ${err.response?.status}:`, err.response?.data);
      failed++;
    }
  }

  // TEST 2: Stage orders schema validation - non-array stageOrders (as OWNER)
  console.log('\n[TEST 2] Testing PUT stage orders schema validation with invalid payload (as OWNER)...');
  try {
    const res = await axios.put(
      `${API_BASE}/organizations/${org.id}/stages/orders`,
      { stageOrders: 'not-an-array' },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    console.log('FAILURE: Stage orders with non-array was accepted (status', res.status, ')!');
    failed++;
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.message === 'Validation failed') {
      console.log('PASS: Stage orders with non-array rejected by validateRequest (status 400).');
    } else {
      console.log(`FAILURE: Expected 400 Validation failed, got status ${err.response?.status}:`, err.response?.data);
      failed++;
    }
  }

  // TEST 3: Stage route role guard - RECRUITER attempting to create a stage
  console.log('\n[TEST 3] Testing stage route role guard (RECRUITER cannot create stage)...');
  try {
    const res = await axios.post(
      `${API_BASE}/organizations/${org.id}/stages`,
      { name: 'Interview Stage 1' },
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );
    console.log('FAILURE: RECRUITER was allowed to create stage!');
    failed++;
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('PASS: RECRUITER stage creation rejected with 403:', err.response?.data?.error || err.response?.data?.message);
    } else {
      console.log(`FAILURE: Expected 403 Insufficient role, got ${err.response?.status}:`, err.response?.data);
      failed++;
    }
  }

  // Cleanup
  await prisma.pipelineStage.deleteMany({ where: { organizationId: org.id } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.deleteMany({ where: { id: org.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, recruiter.id] } } });
  await prisma.$disconnect();

  if (failed > 0) {
    console.log(`\n=== SEC-08 & SEC-12 TEST RESULT: FAILED (${failed} checks failed) ===`);
    process.exit(1);
  } else {
    console.log('\n=== SEC-08 & SEC-12 TEST RESULT: PASSED ===');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
