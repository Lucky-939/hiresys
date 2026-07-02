import { prisma } from "../../config/database";

export class NotificationService {
  async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async createNotification(userId: string, title: string, desc: string) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        desc,
      },
    });

    // Emit real-time event to the specific user's room
    import("../../server").then(({ io }) => {
      io.to(`user:${userId}`).emit("notification:new", notification);
    }).catch(err => console.error("Failed to import io:", err));

    return notification;
  }
}
