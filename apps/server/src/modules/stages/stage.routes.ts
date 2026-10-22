import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireOrgRole } from "../../middleware/rbac.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import * as controller from "./stage.controller";

export const stageRoutes = Router({ mergeParams: true }); // to access :orgId

stageRoutes.use(authenticate);

stageRoutes.get(
  "/",
  requireOrgRole("OWNER", "ADMIN", "RECRUITER", "INTERVIEWER"),
  controller.getStages
);

stageRoutes.get(
  "/org/:orgId",
  requireOrgRole("OWNER", "ADMIN", "RECRUITER", "INTERVIEWER"),
  controller.getStages
);

stageRoutes.post(
  "/",
  requireOrgRole("OWNER", "ADMIN"),
  validateRequest([
    { field: "name", required: true, type: "string", minLength: 1 },
  ]),
  controller.createStage
);

stageRoutes.put(
  "/orders",
  requireOrgRole("OWNER", "ADMIN"),
  validateRequest([
    { field: "stageOrders", required: true, type: "array" },
  ]),
  controller.updateStageOrders
);

stageRoutes.put(
  "/:stageId",
  requireOrgRole("OWNER", "ADMIN"),
  controller.updateStage
);

stageRoutes.delete(
  "/:stageId",
  requireOrgRole("OWNER", "ADMIN"),
  controller.deleteStage
);
