import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { requireOrgRole } from "../../middleware/rbac.middleware";
import {
  createJob,
  getJobsByOrg,
  getJobById,
  updateJob,
  deleteJob
} from "./job.controller";

export const jobRoutes = Router();

jobRoutes.post(
  "/",
  authenticate,
  validateRequest([
    { field: "organizationId", required: true, type: "string" },
    { field: "title", required: true, type: "string", minLength: 2 },
    { field: "description", required: true, type: "string", minLength: 10 },
    { field: "department", required: false, type: "string" },
    { field: "location", required: false, type: "string" },
  ]),
  createJob
);

jobRoutes.get(
  "/",
  authenticate,
  getJobsByOrg
);

jobRoutes.get(
  "/org/:orgId",
  authenticate,
  getJobsByOrg
);

jobRoutes.get(
  "/:id",
  authenticate,
  getJobById
);

jobRoutes.patch(
  "/:id",
  authenticate,
  validateRequest([
    { field: "title", required: false, type: "string", minLength: 2 },
    { field: "description", required: false, type: "string", minLength: 10 },
    { field: "department", required: false, type: "string" },
    { field: "location", required: false, type: "string" },
    { field: "status", required: false, type: "string" },
  ]),
  updateJob
);

jobRoutes.delete(
  "/:id",
  authenticate,
  deleteJob
);
