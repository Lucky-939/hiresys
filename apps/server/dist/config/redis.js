"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.connectRedis = connectRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
exports.redis = new ioredis_1.default(REDIS_URL, {
    lazyConnect: true,
    retryStrategy: (times) => {
        const delay = Math.min(times * 500, 10000);
        console.log(`Retrying Redis connection in ${delay}ms... (Attempt ${times})`);
        return delay;
    },
});
exports.redis.on("connect", () => console.log("Redis connected"));
exports.redis.on("error", (err) => console.error("Redis error:", err.message));
async function connectRedis() {
    try {
        await exports.redis.connect();
    }
    catch (err) {
        console.error("Initial Redis connection failed, continuing to reconnect in background.");
    }
}
