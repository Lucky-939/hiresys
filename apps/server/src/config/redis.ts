import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 500, 10000);
    console.log(`Retrying Redis connection in ${delay}ms... (Attempt ${times})`);
    return delay;
  },
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err.message));

export async function connectRedis() {
  try {
    await redis.connect();
  } catch (err) {
    console.error("Initial Redis connection failed, continuing to reconnect in background.");
  }
}
