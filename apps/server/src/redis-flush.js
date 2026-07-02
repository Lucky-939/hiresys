const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function main() {
  await redis.flushall();
  console.log("Redis flushed successfully");
  
  const keys = await redis.keys('*');
  console.log("Redis keys count:", keys.length);
}

main().catch(console.error).finally(() => process.exit(0));
