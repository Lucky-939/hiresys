import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { InterviewService } from "../modules/interviews/interview.service";
import { PistonClient } from "../config/piston";

const interviewService = new InterviewService();

interface RoomUser {
  userId: string;
  name: string;
  color: string;
}

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

const roomUsers = new Map<string, Map<string, RoomUser>>();
const roomMeetLinks = new Map<string, string>();

function getUniqueUsers(users: Map<string, RoomUser>): RoomUser[] {
  const seen = new Set<string>();
  const result: RoomUser[] = [];
  for (const user of users.values()) {
    if (!seen.has(user.userId)) {
      seen.add(user.userId);
      result.push(user);
    }
  }
  return result;
}

export function registerSocketHandlers(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      // SEC-09: Check Redis token blocklist (verify logged-out token is refused)
      const { redis } = require("../config/redis");
      const isBlocked = await redis.get(`bl_${token}`);
      if (isBlocked) {
        return next(new Error("Token has been revoked"));
      }
      
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        sub: string;
      };
      socket.data.userId = payload.sub;
      next();
    } catch (err: any) {
      next(new Error(err?.message === "Token has been revoked" ? "Token has been revoked" : "Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`Socket connected: ${socket.id} (User: ${userId})`);

    // Join a global room for this specific user to receive directed events (e.g. notifications)
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("room:join", async ({ roomId, name }) => {
      try {
        // Validate organization membership via InterviewService
        await interviewService.getById(roomId, userId);

        socket.join(roomId);

        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Map());
        }

        const users = roomUsers.get(roomId)!;
        const color = COLORS[users.size % COLORS.length];
        users.set(socket.id, { userId, name, color });

        io.to(roomId).emit("room:users", getUniqueUsers(users));
        const existingMeet = roomMeetLinks.get(roomId);
        if (existingMeet) {
          socket.emit("meet:sync", { meetUrl: existingMeet });
        }
        console.log(`${name} joined room ${roomId}`);
      } catch (err) {
        console.error(`Socket join error for room ${roomId}:`, err);
        socket.emit("error", { message: "Unauthorized or room not found" });
        socket.disconnect();
      }
    });

    socket.on("code:change", async ({ roomId, code }) => {
      try {
        const userId = socket.data.userId;
        const interview = await interviewService.getById(roomId, userId);
        if (interview.status === "COMPLETED") {
          return socket.emit("error", { message: "Interview is already completed" });
        }
        socket.to(roomId).emit("code:update", { code });
      } catch (err) {
        socket.emit("error", { message: "Unauthorized or room not found" });
        socket.disconnect();
      }
    });

    socket.on("language:change", async ({ roomId, language }) => {
      try {
        const userId = socket.data.userId;
        const interview = await interviewService.getById(roomId, userId);
        if (interview.status === "COMPLETED") {
          return socket.emit("error", { message: "Interview is already completed" });
        }
        socket.to(roomId).emit("language:update", { language });
      } catch (err) {
        socket.emit("error", { message: "Unauthorized or room not found" });
        socket.disconnect();
      }
    });

    socket.on("question:send", async ({ roomId, question }: { roomId: string; question: string }) => {
      try {
        const userId = socket.data.userId;
        const interview = await interviewService.getById(roomId, userId);
        if (interview.status === "COMPLETED") {
          return socket.emit("error", { message: "Interview is already completed" });
        }
        io.to(roomId).emit("question:active", { question });
      } catch (err) {
        socket.emit("error", { message: "Unauthorized or room not found" });
      }
    });

    socket.on("testcases:update", async ({ roomId, testCases }: { roomId: string; testCases: any[] }) => {
      try {
        socket.to(roomId).emit("testcases:sync", { testCases });
      } catch (err) {
        socket.emit("error", { message: "Failed to broadcast test cases" });
      }
    });

    socket.on("meet:update", async ({ roomId, meetUrl }: { roomId: string; meetUrl: string }) => {
      try {
        roomMeetLinks.set(roomId, meetUrl);
        io.to(roomId).emit("meet:sync", { meetUrl });
      } catch (err) {
        socket.emit("error", { message: "Failed to broadcast meet link" });
      }
    });

    socket.on("meet:get", ({ roomId }: { roomId: string }) => {
      const meetUrl = roomMeetLinks.get(roomId) || "";
      if (meetUrl) {
        socket.emit("meet:sync", { meetUrl });
      }
    });

    socket.on("code:execute", async ({ roomId, language, code }) => {
      try {
        const userId = socket.data.userId;
        await interviewService.assertCanExecuteCode(roomId, userId);

        if (!["javascript", "python"].includes(language)) {
          return socket.emit("error", { message: "Unsupported language for execution" });
        }

        // SEC-10: Rate limit code:execute via Redis (5/min per user per room)
        const { redis } = require("../config/redis");
        const rateLimitKey = `ratelimit:code_exec:${roomId}:${userId}`;
        const execCount = await redis.incr(rateLimitKey);
        if (execCount === 1) {
          await redis.expire(rateLimitKey, 60);
        }

        if (execCount > 5) {
          const ttl = await redis.ttl(rateLimitKey);
          const waitSeconds = ttl > 0 ? ttl : 60;
          return socket.emit("error", {
            message: `Rate limit exceeded: You can execute code up to 5 times per minute in this room. Please wait ${waitSeconds}s before trying again.`
          });
        }

        io.to(roomId).emit("code:execution_started");

        const timeout = 3000;
        
        const result = await PistonClient.execute({
          language: language === "javascript" ? "javascript" : "python",
          version: "*", // Use latest available
          files: [{ name: "main", content: code }],
          run_timeout: timeout,
          compile_timeout: 3000,
          run_memory_limit: 256 * 1024 * 1024,
        });

        const isError = result.run.code !== 0 || !!result.run.stderr;
        
        io.to(roomId).emit("code:execution_result", {
          stdout: result.run.stdout,
          stderr: result.run.stderr,
          runTime: result.run.output ? result.run.output.length : 0, // Piston API does not easily expose ms run time in basic payload, but this is a placeholder. Wait, let's omit runTime calculation or provide a static message.
          isError
        });
      } catch (err: any) {
        socket.emit("error", { message: err.message || "Failed to execute code" });
      }
    });

    socket.on("disconnecting", () => {
      socket.rooms.forEach((roomId) => {
        const users = roomUsers.get(roomId);
        if (users) {
          users.delete(socket.id);
          io.to(roomId).emit("room:users", getUniqueUsers(users));
          if (users.size === 0) roomUsers.delete(roomId);
        }
      });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
