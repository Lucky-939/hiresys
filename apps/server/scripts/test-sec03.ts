import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api';

async function main() {
  console.log('=== REGRESSION TEST FOR SEC-03 ===');
  const runId = Date.now();
  
  // 1. Create Org A and Owner A
  const ownerA = await prisma.user.create({
    data: {
      name: 'SEC03 Owner A',
      email: `ownerA_${runId}@example.com`,
      password: 'password123',
      emailVerified: new Date(),
    }
  });
  const orgA = await prisma.organization.create({
    data: {
      name: `SEC03 Org A ${runId}`,
      slug: `sec03-org-a-${runId}`,
      members: { create: { userId: ownerA.id, role: 'OWNER' } },
    }
  });
  const stageA1 = await prisma.pipelineStage.create({
    data: { name: 'A-Applied', color: '#10B981', order: 0, organizationId: orgA.id }
  });
  const stageA2 = await prisma.pipelineStage.create({
    data: { name: 'A-Interview', color: '#3B82F6', order: 1, organizationId: orgA.id }
  });

  // 2. Create Org B and Owner B
  const ownerB = await prisma.user.create({
    data: {
      name: 'SEC03 Owner B',
      email: `ownerB_${runId}@example.com`,
      password: 'password123',
      emailVerified: new Date(),
    }
  });
  const orgB = await prisma.organization.create({
    data: {
      name: `SEC03 Org B ${runId}`,
      slug: `sec03-org-b-${runId}`,
      members: { create: { userId: ownerB.id, role: 'OWNER' } },
    }
  });
  const stageB1 = await prisma.pipelineStage.create({
    data: { name: 'B-Initial', color: '#F59E0B', order: 10, organizationId: orgB.id }
  });

  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-chars';
  const tokenA = jwt.sign({ sub: ownerA.id }, jwtSecret, { expiresIn: '1h' });

  let failedTests = 0;

  console.log('\n[TEST 1] Owner A calls stage reorder on Org A including Stage B1 (from Org B)');
  try {
    const res = await axios.put(
      `${API_BASE}/organizations/${orgA.id}/stages/orders`,
      {
        stageOrders: [
          { id: stageA1.id, order: 1 },
          { id: stageB1.id, order: 999 }, // Belongs to Org B!
        ]
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    // Check if Stage B1 was modified in DB
    const refreshedB1 = await prisma.pipelineStage.findUnique({ where: { id: stageB1.id } });
    if (refreshedB1 && refreshedB1.order === 999) {
      console.log('UNEXPECTED SUCCESS (IDOR Vulnerability Present): Org A modified Org B stage order! Status:', res.status, 'New B1 order:', refreshedB1.order);
      failedTests++;
    } else {
      console.log('Request succeeded but stage order was not changed.');
    }
  } catch (err: any) {
    if (err.response && (err.response.status === 400 || err.response.status === 403 || err.response.status === 404)) {
      console.log('EXPECTED REJECTION: Server rejected cross-org stage reorder with status:', err.response.status, err.response.data);
      const refreshedB1 = await prisma.pipelineStage.findUnique({ where: { id: stageB1.id } });
      console.log('Verified Org B stage was untouched: order =', refreshedB1?.order);
    } else {
      console.log('UNEXPECTED ERROR:', err.message, err.response ? err.response.data : '');
      failedTests++;
    }
  }

  // Cleanup
  await prisma.pipelineStage.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerA.id, ownerB.id] } } });
  await prisma.$disconnect();

  if (failedTests > 0) {
    console.log(`\n=== TEST SUMMARY: ${failedTests} test failed (Vulnerability Confirmed) ===`);
    process.exit(1);
  } else {
    console.log('\n=== TEST SUMMARY: All SEC-03 tests passed! ===');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
