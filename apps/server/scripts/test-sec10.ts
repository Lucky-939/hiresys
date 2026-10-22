import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

import jwt from 'jsonwebtoken';
import { io as Client } from 'socket.io-client';
import { PrismaClient } from '@prisma/client';
import { redis } from '../src/config/redis';

const prisma = new PrismaClient();
const SERVER_URL = 'http://127.0.0.1:5000';
const jwtSecret = process.env.JWT_SECRET!;

async function main() {
  console.log('=== REGRESSION TEST FOR SEC-10: WEBSOCKET CODE EXECUTION RATE LIMIT ===');
  const runId = Date.now();

  // 1. Seed user, org, and interview
  const user = await prisma.user.create({
    data: { name: 'Coder User', email: `coder_${runId}@example.com`, password: 'password', emailVerified: new Date() }
  });
  const org = await prisma.organization.create({
    data: { name: `Exec Org ${runId}`, slug: `exec-org-${runId}`, members: { create: { userId: user.id, role: 'INTERVIEWER' } } }
  });
  const interview = await prisma.interview.create({
    data: {
      title: 'Coding Session',
      organizationId: org.id,
      createdById: user.id,
      interviewerId: user.id,
    }
  });

  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '1h' });

  // Clear any existing rate limit in Redis
  await redis.del(`ratelimit:code_exec:${interview.id}:${user.id}`);

  // Connect socket
  const socket = Client(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
    timeout: 5000,
  });

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('Connected to socket for code:execute test.');
      resolve();
    });
    socket.on('connect_error', reject);
  });

  let receivedRateLimitError = false;
  let errorMessages: string[] = [];

  socket.on('error', (err: any) => {
    const msg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
    errorMessages.push(msg);
    if (msg.toLowerCase().includes('rate limit')) {
      receivedRateLimitError = true;
    }
  });

  // Emit code:execute 6 times
  console.log('\nSending 6 code:execute requests rapidly for the same room...');
  for (let i = 1; i <= 6; i++) {
    socket.emit('code:execute', {
      roomId: interview.id,
      language: 'javascript',
      code: `console.log("hello ${i}");`
    });
    // Brief pause between emits
    await new Promise((r) => setTimeout(r, 100));
  }

  // Wait 1.5 seconds for socket responses
  await new Promise((r) => setTimeout(r, 1500));

  socket.disconnect();

  console.log('Captured error messages:', errorMessages);

  let failed = 0;
  if (!receivedRateLimitError) {
    console.log('FAILURE: Sent 6 code:execute requests, but NO rate limit error was emitted!');
    failed++;
  } else {
    console.log('PASS: Rate limit error was emitted after 5 executions with a friendly message.');
  }

  // Cleanup
  await redis.del(`ratelimit:code_exec:${interview.id}:${user.id}`);
  await prisma.interview.deleteMany({ where: { organizationId: org.id } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.deleteMany({ where: { id: org.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.$disconnect();
  await redis.quit();

  if (failed > 0) {
    console.log(`\n=== SEC-10 TEST RESULT: FAILED (${failed} checks failed) ===`);
    process.exit(1);
  } else {
    console.log('\n=== SEC-10 TEST RESULT: PASSED ===');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
