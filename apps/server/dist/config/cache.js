"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCache = getCache;
exports.setCache = setCache;
exports.deleteCache = deleteCache;
const redis_1 = require("./redis");
const DEFAULT_TTL = 60 * 60 * 24; // 24 hours
async function getCache(key) {
    try {
        const data = await redis_1.redis.get(key);
        if (!data)
            return null;
        return JSON.parse(data);
    }
    catch {
        return null;
    }
}
async function setCache(key, value, ttl = DEFAULT_TTL) {
    try {
        await redis_1.redis.set(key, JSON.stringify(value), "EX", ttl);
    }
    catch {
        console.error("Cache write failed");
    }
}
async function deleteCache(key) {
    try {
        await redis_1.redis.del(key);
    }
    catch {
        console.error("Cache delete failed");
    }
}
