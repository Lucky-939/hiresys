import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { redis } from '../src/config/redis';

const prisma = new PrismaClient();
const API_BASE = 'http://127.0.0.1:5000/api';

async function main() {
  console.log('=== REGRESSION TEST FOR SEC-06: OTP RATE LIMIT & LOCKOUT ===');
  const runId = Date.now();
  const testEmail = `otp_test_${runId}@example.com`;

  // 1. Create unverified user
  const user = await prisma.user.create({
    data: {
      name: 'OTP Test User',
      email: testEmail,
      password: 'password123',
      emailVerified: null,
    }
  });

  const correctOtp = '987654';
  await redis.setex(`verify_${user.id}`, 600, correctOtp);
  await redis.del(`verify_attempts_${user.id}`);

  let failedChecks = 0;

  console.log(`[TEST 1] Sending 4 failed OTP attempts for userId ${user.id}...`);
  for (let i = 1; i <= 4; i++) {
    try {
      await axios.post(`${API_BASE}/auth/verify-email`, {
        userId: user.id,
        code: `00000${i}`
      });
      console.log(`Unexpected success on bad attempt ${i}`);
      failedChecks++;
    } catch (err: any) {
      if (err.response?.status !== 400) {
        console.log(`Attempt ${i}: Unexpected status code ${err.response?.status}`);
      } else {
        console.log(`Attempt ${i} rejected as expected (status 400). Response:`, err.response?.data?.error || err.response?.data?.message);
      }
    }
  }

  console.log('\n[TEST 2] Sending 5th failed OTP attempt (should trigger lockout & invalidate code)...');
  try {
    const res = await axios.post(`${API_BASE}/auth/verify-email`, {
      userId: user.id,
      code: '000005'
    });
    console.log('FAILURE: 5th failed attempt was accepted?!');
    failedChecks++;
  } catch (err: any) {
    const status = err.response?.status;
    const msg = err.response?.data?.error || err.response?.data?.message || '';
    console.log(`5th attempt response (status ${status}):`, msg);
    
    // Check if code was invalidated in Redis
    const remainingOtp = await redis.get(`verify_${user.id}`);
    if (remainingOtp) {
      console.log('FAILURE: verify code still exists in Redis after 5 failed attempts! Stored OTP =', remainingOtp);
      failedChecks++;
    } else {
      console.log('PASS: OTP code was successfully invalidated in Redis.');
    }
  }

  console.log('\n[TEST 3] Sending 6th attempt with CORRECT code (must fail because code was invalidated)...');
  try {
    await axios.post(`${API_BASE}/auth/verify-email`, {
      userId: user.id,
      code: correctOtp
    });
    console.log('FAILURE: Verification succeeded with correct code after lockout!');
    failedChecks++;
  } catch (err: any) {
    console.log('PASS: Correct code was rejected after code invalidation. Response:', err.response?.data?.error || err.response?.data?.message);
  }

  // Cleanup
  await redis.del(`verify_${user.id}`);
  await redis.del(`verify_attempts_${user.id}`);
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();

  if (failedChecks > 0) {
    console.log(`\n=== SEC-06 TEST RESULT: FAILED (${failedChecks} checks failed) ===`);
    process.exit(1);
  } else {
    console.log('\n=== SEC-06 TEST RESULT: PASSED ===');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
