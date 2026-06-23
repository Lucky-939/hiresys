import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { getDashboardStats } from "./dashboard.controller";

export const dashboardRoutes = Router();

dashboardRoutes.get("/stats", authenticate, getDashboardStats);
