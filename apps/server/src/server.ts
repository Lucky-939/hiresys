import "dotenv/config";

const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "REDIS_URL", "GEMINI_API_KEY", "CLIENT_URL"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL ERROR: Environment variable ${envVar} is missing.`);
    process.exit(1);
  }
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

import http from "http";
import { Server as SocketServer } from "socket.io";
import { prisma } from "./config/database";
import { connectRedis } from "./config/redis";
import app from "./app";
import { registerSocketHandlers } from "./socket/socket.handler";
import "./queues/resume.queue";

const PORT = Number(process.env.PORT) || 5000;

const httpServer = http.createServer(app);

export const io = new SocketServer(httpServer, {
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

registerSocketHandlers(io);

prisma
  .$connect()
  .then(async () => {
    console.log("Database connected");

    await connectRedis();

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    httpServer.on("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    });

    process.on("SIGINT", () => {
      httpServer.close(() => {
        prisma.$disconnect();
        process.exit(0);
      });
    });

    process.on("SIGTERM", () => {
      httpServer.close(() => {
        prisma.$disconnect();
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
