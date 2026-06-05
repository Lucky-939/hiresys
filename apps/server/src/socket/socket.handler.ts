import { Server, Socket } from "socket.io";

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
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("room:join", ({ roomId, userId, name }) => {
      socket.join(roomId);

      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
      }

      const users = roomUsers.get(roomId)!;
      const color = COLORS[users.size % COLORS.length];
      users.set(socket.id, { userId, name, color });

      io.to(roomId).emit("room:users", getUniqueUsers(users));
      console.log(`${name} joined room ${roomId}`);
    });

    socket.on("code:change", ({ roomId, code }) => {
      socket.to(roomId).emit("code:update", { code });
    });

    socket.on("language:change", ({ roomId, language }) => {
      socket.to(roomId).emit("language:update", { language });
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
