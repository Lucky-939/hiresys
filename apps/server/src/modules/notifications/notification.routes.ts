import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { authenticate } from "../../middleware/auth.middleware";

export const notificationRoutes = Router();
const controller = new NotificationController();

notificationRoutes.use(authenticate);

notificationRoutes.get("/", controller.getNotifications.bind(controller));
notificationRoutes.put("/read-all", controller.markAllAsRead.bind(controller));
