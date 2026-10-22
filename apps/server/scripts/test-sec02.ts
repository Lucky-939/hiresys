import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api';

async function main() {
  console.log('=== REGRESSION TEST FOR SEC-02 ===');
  const runId = Date.now();
  
  // 1. Create Owner User and Organization
  const owner = await prisma.user.create({
    data: {
      name: 'SEC02 Owner',
      email: `owner_sec02_${runId}@example.com`,
      password: 'hashedpassword123',
      emailVerified: new Date(),
    }
  });
  const org = await prisma.organization.create({
    data: {
      name: `SEC02 Org ${runId}`,
      slug: `sec02-org-${runId}`,
      members: {
        create: {
          userId: owner.id,
          role: 'OWNER',
        }
      }
    }
  });

  // 2. Create Admin User
  const admin = await prisma.user.create({
    data: {
      name: 'SEC02 Admin',
      email: `admin_sec02_${runId}@example.com`,
      password: 'hashedpassword123',
      emailVerified: new Date(),
    }
  });
  await prisma.organizationMember.create({
    data: {
      userId: admin.id,
      organizationId: org.id,
      role: 'ADMIN',
    }
  });

  // 3. Create Interviewer User
  const interviewer = await prisma.user.create({
    data: {
      name: 'SEC02 Interviewer',
      email: `interviewer_sec02_${runId}@example.com`,
      password: 'hashedpassword123',
      emailVerified: new Date(),
    }
  });
  const interviewerMember = await prisma.organizationMember.create({
    data: {
      userId: interviewer.id,
      organizationId: org.id,
      role: 'INTERVIEWER',
    }
  });

  // Generate tokens
  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-chars';
  const adminToken = jwt.sign({ sub: admin.id }, jwtSecret, { expiresIn: '1h' });

  let failedTests = 0;

  // Test 1: Admin attempts to promote Interviewer to OWNER
  console.log('\n[TEST 1] Admin attempts to promote Interviewer to OWNER via PATCH /api/organizations/:orgId/members/:userId/role');
  try {
    const res = await axios.patch(
      `${API_BASE}/organizations/${org.id}/members/${interviewer.id}/role`,
      { role: 'OWNER' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('UNEXPECTED SUCCESS (Vulnerability Present): Admin successfully promoted member to OWNER! Status:', res.status, 'Data:', res.data);
    failedTests++;
  } catch (err: any) {
    if (err.response && (err.response.status === 400 || err.response.status === 403)) {
      console.log('EXPECTED REJECTION: Server rejected promotion to OWNER with status:', err.response.status, err.response.data);
    } else {
      console.log('UNEXPECTED ERROR:', err.message, err.response ? err.response.data : '');
      failedTests++;
    }
  }

  // Test 2: Admin attempts to invite an OWNER
  console.log('\n[TEST 2] Admin attempts to invite an OWNER via POST /api/organizations/:orgId/members/invite');
  try {
    const res = await axios.post(
      `${API_BASE}/organizations/${org.id}/members/invite`,
      { email: `target_owner_${runId}@example.com`, role: 'OWNER' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('UNEXPECTED SUCCESS (Vulnerability Present): Admin successfully invited an OWNER! Status:', res.status, 'Data:', res.data);
    failedTests++;
  } catch (err: any) {
    if (err.response && (err.response.status === 400 || err.response.status === 403)) {
      console.log('EXPECTED REJECTION: Server rejected inviting an OWNER with status:', err.response.status, err.response.data);
    } else {
      console.log('UNEXPECTED ERROR:', err.message, err.response ? err.response.data : '');
      failedTests++;
    }
  }

  // Test 3: Admin attempts to set an invalid role 'SUPERADMIN'
  console.log('\n[TEST 3] Admin attempts to assign invalid role "SUPERADMIN"');
  try {
    const res = await axios.patch(
      `${API_BASE}/organizations/${org.id}/members/${interviewer.id}/role`,
      { role: 'SUPERADMIN' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('UNEXPECTED SUCCESS (Vulnerability Present): Server accepted invalid role SUPERADMIN! Status:', res.status);
    failedTests++;
  } catch (err: any) {
    if (err.response && (err.response.status === 400 || err.response.status === 403)) {
      console.log('EXPECTED REJECTION: Server rejected invalid role with status:', err.response.status, err.response.data);
    } else {
      console.log('UNEXPECTED ERROR:', err.message, err.response ? err.response.data : '');
      failedTests++;
    }
  }

  // Cleanup test data
  await prisma.orgInvite.deleteMany({ where: { organizationId: org.id } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, admin.id, interviewer.id] } } });
  await prisma.$disconnect();

  if (failedTests > 0) {
    console.log(`\n=== TEST SUMMARY: ${failedTests} tests failed (Vulnerabilities Confirmed) ===`);
    process.exit(1);
  } else {
    console.log('\n=== TEST SUMMARY: All SEC-02 tests passed! ===');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
