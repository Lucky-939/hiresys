import { redis } from "./redis";

const DEFAULT_TTL = 60 * 60 * 24; // 24 hours

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttl = DEFAULT_TTL) {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch {
    console.error("Cache write failed");
  }
}

export async function deleteCache(key: string) {
  try {
    await redis.del(key);
  } catch {
    console.error("Cache delete failed");
  }
}
