"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgService = void 0;
const org_repository_1 = require("./org.repository");
const errors_1 = require("../../utils/errors");
const repo = new org_repository_1.OrgRepository();
class OrgService {
    async createOrg(name, ownerId) {
        const slug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const existing = await repo.findBySlug(slug);
        if (existing) {
            throw new errors_1.AppError("An organization with this name already exists", 409);
        }
        return repo.create({ name, slug, ownerId });
    }
    async getUserOrgs(userId) {
        return repo.findUserOrgs(userId);
    }
    async getOrgById(id, userId) {
        const org = await repo.findById(id);
        if (!org)
            throw new errors_1.AppError("Organization not found", 404);
        const isMember = org.members.some((m) => m.userId === userId);
        if (!isMember)
            throw new errors_1.AppError("Access denied", 403);
        return org;
    }
    // --- Members ---
    async getMembers(orgId) {
        return repo.getMembers(orgId);
    }
    async updateMemberRole(orgId, targetUserId, newRole, requesterId) {
        const requester = await repo.getMember(orgId, requesterId);
        if (!requester)
            throw new errors_1.AppError("Requester is not a member", 403);
        const target = await repo.getMember(orgId, targetUserId);
        if (!target)
            throw new errors_1.AppError("Target user is not a member", 404);
        if (target.role === "OWNER") {
            throw new errors_1.AppError("Cannot change role of the owner", 403);
        }
        if (requester.role === "ADMIN" && target.role === "ADMIN") {
            throw new errors_1.AppError("Only owner can manage admin accounts", 403);
        }
        return repo.updateMemberRole(orgId, targetUserId, newRole);
    }
    async removeMember(orgId, targetUserId, requesterId) {
        if (targetUserId === requesterId) {
            throw new errors_1.AppError("You cannot remove yourself", 400);
        }
        const requester = await repo.getMember(orgId, requesterId);
        if (!requester)
            throw new errors_1.AppError("Requester is not a member", 403);
        const target = await repo.getMember(orgId, targetUserId);
        if (!target)
            throw new errors_1.AppError("Target user is not a member", 404);
        if (target.role === "OWNER") {
            throw new errors_1.AppError("Cannot remove the owner", 403);
        }
        if (requester.role === "ADMIN" && target.role === "ADMIN") {
            throw new errors_1.AppError("Only owner can remove admin accounts", 403);
        }
        return repo.removeMember(orgId, targetUserId);
    }
    // --- Invites ---
    async inviteMember(orgId, email, role, requesterId) {
        // 1. Check if user already exists and is a member
        const { prisma } = require("../../config/database");
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            const existingMember = await repo.getMember(orgId, existingUser.id);
            if (existingMember) {
                throw new errors_1.AppError("User is already a member of this organization", 400);
            }
        }
        // 2. Check for active invite
        const activeInvite = await repo.findActiveInvite(email, orgId);
        if (activeInvite) {
            // Return existing valid invite
            return activeInvite;
        }
        // 3. Create new invite (valid for 7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        return repo.createInvite({
            email,
            organizationId: orgId,
            role,
            createdById: requesterId,
            expiresAt,
        });
    }
    async getInviteByToken(token) {
        const invite = await repo.findInviteByToken(token);
        if (!invite)
            throw new errors_1.AppError("Invite not found", 404);
        // @ts-ignore
        if (invite.acceptedAt)
            throw new errors_1.AppError("Invite already used", 400);
        // @ts-ignore
        if (invite.expiresAt < new Date())
            throw new errors_1.AppError("Invite expired", 400);
        return invite;
    }
    async acceptInvite(token, userId) {
        const invite = await this.getInviteByToken(token);
        // Check if the user's email matches the invite email
        const { prisma } = require("../../config/database");
        const user = await prisma.user.findUnique({ where: { id: userId } });
        // @ts-ignore
        if (user?.email !== invite.email) {
            throw new errors_1.AppError("This invite is not for your email address", 400);
        }
        try {
            // @ts-ignore
            await repo.acceptInvite(invite.id, invite.organizationId, userId, invite.role);
        }
        catch (err) {
            throw new errors_1.AppError(err.message || "Failed to accept invite", 400);
        }
        return { success: true };
    }
}
exports.OrgService = OrgService;
