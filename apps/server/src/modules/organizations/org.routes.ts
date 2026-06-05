import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { createOrg, getMyOrgs, getOrgById } from "./org.controller";

export const orgRoutes = Router();

orgRoutes.use(authenticate); // all org routes require login

orgRoutes.post("/", createOrg);
orgRoutes.get("/mine", getMyOrgs);
orgRoutes.get("/:id", getOrgById);
