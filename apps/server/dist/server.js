"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
require("dotenv/config");
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "REDIS_URL", "GEMINI_API_KEY", "CLIENT_URL"];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`FATAL ERROR: Environment variable ${envVar} is missing.`);
        process.exit(1);
    }
}
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const app_1 = __importDefault(require("./app"));
const socket_handler_1 = require("./socket/socket.handler");
require("./queues/resume.queue");
const PORT = Number(process.env.PORT) || 5000;
const httpServer = http_1.default.createServer(app_1.default);
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    },
});
(0, socket_handler_1.registerSocketHandlers)(exports.io);
database_1.prisma
    .$connect()
    .then(async () => {
    console.log("Database connected");
    await (0, redis_1.connectRedis)();
    httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
    httpServer.on("error", (err) => {
        console.error("Server error:", err);
        process.exit(1);
    });
    process.on("SIGINT", () => {
        httpServer.close(() => {
            database_1.prisma.$disconnect();
            process.exit(0);
        });
    });
    process.on("SIGTERM", () => {
        httpServer.close(() => {
            database_1.prisma.$disconnect();
            process.exit(0);
        });
    });
})
    .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
});
