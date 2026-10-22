import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";

let socket: Socket | null = null;
let currentSocketToken: string | null = null;

export function getSocket(overrideToken?: string): Socket {
  const token =
    overrideToken ||
    useAuthStore.getState().token ||
    (typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("token") ||
         sessionStorage.getItem("candidate_room_token") ||
         localStorage.getItem("token"))
      : null);

  if (!socket || (token && token !== currentSocketToken)) {
    if (socket) {
      socket.disconnect();
    }
    currentSocketToken = token;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const socketUrl = apiUrl.replace(/\/api$/, "");
    socket = io(socketUrl, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: (cb) => {
        cb({ token: currentSocketToken });
      },
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentSocketToken = null;
  }
}
