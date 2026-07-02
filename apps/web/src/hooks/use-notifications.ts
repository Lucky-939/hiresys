import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth.store";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  desc: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Fetch initial notifications
    api.get("/notifications")
      .then(res => {
        if (res.data?.data) {
          setNotifications(res.data.data);
        }
      })
      .catch(console.error);

    // Setup socket connection
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [user]);

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    markAllAsRead
  };
}
