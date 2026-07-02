import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireOrgRole } from "../../middleware/rbac.middleware";
import { 
  createOrg, 
  getMyOrgs, 
  getOrgById,
  updateOrg,
  getMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  getInvite,
  acceptInvite
} from "./org.controller";
import { validateRequest } from "../../middleware/validate.middleware";

export const orgRoutes = Router();

// Public / Authenticated without org role
orgRoutes.get("/invite/:token", getInvite);
orgRoutes.post("/invite/:token/accept", authenticate, acceptInvite);

orgRoutes.use(authenticate); // all subsequent org routes require login

orgRoutes.post(
  "/",
  validateRequest([
    { field: "name", required: true, type: "string", minLength: 2 },
  ]),
  createOrg
);
orgRoutes.get("/mine", getMyOrgs);
orgRoutes.get("/:id", getOrgById);
orgRoutes.patch(
  "/:id",
  validateRequest([
    { field: "name", required: true, type: "string", minLength: 2 },
  ]),
  updateOrg
);

// --- Members & RBAC ---
orgRoutes.get("/:orgId/members", requireOrgRole("OWNER", "ADMIN", "MEMBER"), getMembers);
orgRoutes.post(
  "/:orgId/members/invite",
  requireOrgRole("OWNER", "ADMIN"),
  validateRequest([{ field: "email", required: true, type: "string", minLength: 5 }]),
  inviteMember
);
orgRoutes.patch(
  "/:orgId/members/:userId/role",
  requireOrgRole("OWNER", "ADMIN"),
  validateRequest([{ field: "role", required: true, type: "string" }]),
  updateMemberRole
);
orgRoutes.delete("/:orgId/members/:userId", requireOrgRole("OWNER", "ADMIN"), removeMember);
