import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { InterviewService } from "../modules/interviews/interview.service";

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
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }
      
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        sub: string;
      };
      socket.data.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
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
