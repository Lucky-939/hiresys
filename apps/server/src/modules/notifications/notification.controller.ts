import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { NotificationService } from "./notification.service";

const notificationService = new NotificationService();

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response) {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const notifications = await notificationService.getUserNotifications(userId);
      res.json({ data: notifications });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      await notificationService.markAllAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}
