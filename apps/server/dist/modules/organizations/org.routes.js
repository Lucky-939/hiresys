"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgRoutes = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const org_controller_1 = require("./org.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
exports.orgRoutes = (0, express_1.Router)();
// Public / Authenticated without org role
exports.orgRoutes.get("/invite/:token", org_controller_1.getInvite);
exports.orgRoutes.post("/invite/:token/accept", auth_middleware_1.authenticate, org_controller_1.acceptInvite);
exports.orgRoutes.use(auth_middleware_1.authenticate); // all subsequent org routes require login
exports.orgRoutes.post("/", (0, validate_middleware_1.validateRequest)([
    { field: "name", required: true, type: "string", minLength: 2 },
]), org_controller_1.createOrg);
exports.orgRoutes.get("/mine", org_controller_1.getMyOrgs);
exports.orgRoutes.get("/:id", org_controller_1.getOrgById);
// --- Members & RBAC ---
exports.orgRoutes.get("/:orgId/members", (0, rbac_middleware_1.requireOrgRole)("OWNER", "ADMIN", "MEMBER"), org_controller_1.getMembers);
exports.orgRoutes.post("/:orgId/members/invite", (0, rbac_middleware_1.requireOrgRole)("OWNER", "ADMIN"), (0, validate_middleware_1.validateRequest)([{ field: "email", required: true, type: "string", minLength: 5 }]), org_controller_1.inviteMember);
exports.orgRoutes.patch("/:orgId/members/:userId/role", (0, rbac_middleware_1.requireOrgRole)("OWNER", "ADMIN"), (0, validate_middleware_1.validateRequest)([{ field: "role", required: true, type: "string" }]), org_controller_1.updateMemberRole);
exports.orgRoutes.delete("/:orgId/members/:userId", (0, rbac_middleware_1.requireOrgRole)("OWNER", "ADMIN"), org_controller_1.removeMember);
