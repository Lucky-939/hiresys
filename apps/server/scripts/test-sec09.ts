import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import { io as Client } from 'socket.io-client';
import { redis } from '../src/config/redis';

const SERVER_URL = 'http://127.0.0.1:5000';
const jwtSecret = process.env.JWT_SECRET!;

function connectSocket(token: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const socket = Client(SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      timeout: 3000,
      reconnection: false,
    });

    socket.on('connect', () => {
      socket.disconnect();
      resolve({ success: true });
    });

    socket.on('connect_error', (err: any) => {
      resolve({ success: false, error: err.message });
    });
  });
}

async function main() {
  console.log('=== REGRESSION TEST FOR SEC-09: WEBSOCKET TOKEN BLOCKLIST CHECK ===');
  let failed = 0;

  const fakeUserId = `user_ws_${Date.now()}`;
  const validToken = jwt.sign({ sub: fakeUserId }, jwtSecret, { expiresIn: '1h' });

  // 1. Test connection with valid unblocked token
  console.log('\n[TEST 1] Connecting WebSocket with valid unblocked token...');
  const res1 = await connectSocket(validToken);
  if (!res1.success) {
    console.log('FAILURE: Could not connect with valid token:', res1.error);
    failed++;
  } else {
    console.log('PASS: WebSocket connected successfully with valid token.');
  }

  // 2. Blocklist the token in Redis (simulate logout)
  console.log('\n[TEST 2] Blocklisting token in Redis (simulate logout)...');
  await redis.setex(`bl_${validToken}`, 3600, 'true');

  // 3. Attempt to connect with the blocklisted token
  console.log('[TEST 3] Connecting WebSocket with blocklisted (logged-out) token...');
  const res2 = await connectSocket(validToken);

  if (res2.success) {
    console.log('FAILURE: Logged-out / blocklisted token was ALLOWED to connect to WebSocket!');
    failed++;
  } else {
    console.log('PASS: Logged-out / blocklisted token was REFUSED by WebSocket handshake:', res2.error);
  }

  // Cleanup
  await redis.del(`bl_${validToken}`);

  if (failed > 0) {
    console.log(`\n=== SEC-09 TEST RESULT: FAILED (${failed} checks failed) ===`);
    process.exit(1);
  } else {
    console.log('\n=== SEC-09 TEST RESULT: PASSED ===');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
