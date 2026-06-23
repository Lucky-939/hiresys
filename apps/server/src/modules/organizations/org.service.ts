import { OrgRepository } from "./org.repository";
import { AppError } from "../../utils/errors";

const repo = new OrgRepository();

export class OrgService {
  async createOrg(name: string, ownerId: string) {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const existing = await repo.findBySlug(slug);
    if (existing) {
      throw new AppError("An organization with this name already exists", 409);
    }

    return repo.create({ name, slug, ownerId });
  }

  async getUserOrgs(userId: string) {
    return repo.findUserOrgs(userId);
  }

  async getOrgById(id: string, userId: string) {
    const org = await repo.findById(id);
    if (!org) throw new AppError("Organization not found", 404);

    const isMember = org.members.some((m) => m.userId === userId);
    if (!isMember) throw new AppError("Access denied", 403);

    return org;
  }

  // --- Members ---

  async getMembers(orgId: string) {
    return repo.getMembers(orgId);
  }

  async updateMemberRole(orgId: string, targetUserId: string, newRole: "ADMIN" | "MEMBER", requesterId: string) {
    const requester = await repo.getMember(orgId, requesterId);
    if (!requester) throw new AppError("Requester is not a member", 403);

    const target = await repo.getMember(orgId, targetUserId);
    if (!target) throw new AppError("Target user is not a member", 404);

    if (target.role === "OWNER") {
      throw new AppError("Cannot change role of the owner", 403);
    }

    if (requester.role === "ADMIN" && target.role === "ADMIN") {
      throw new AppError("Only owner can manage admin accounts", 403);
    }

    return repo.updateMemberRole(orgId, targetUserId, newRole);
  }

  async removeMember(orgId: string, targetUserId: string, requesterId: string) {
    if (targetUserId === requesterId) {
      throw new AppError("You cannot remove yourself", 400);
    }

    const requester = await repo.getMember(orgId, requesterId);
    if (!requester) throw new AppError("Requester is not a member", 403);

    const target = await repo.getMember(orgId, targetUserId);
    if (!target) throw new AppError("Target user is not a member", 404);

    if (target.role === "OWNER") {
      throw new AppError("Cannot remove the owner", 403);
    }

    if (requester.role === "ADMIN" && target.role === "ADMIN") {
      throw new AppError("Only owner can remove admin accounts", 403);
    }

    return repo.removeMember(orgId, targetUserId);
  }

  // --- Invites ---

  async inviteMember(orgId: string, email: string, role: "ADMIN" | "MEMBER", requesterId: string) {
    // 1. Check if user already exists and is a member
    const { prisma } = require("../../config/database");
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await repo.getMember(orgId, existingUser.id);
      if (existingMember) {
        throw new AppError("User is already a member of this organization", 400);
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

  async getInviteByToken(token: string) {
    const invite = await repo.findInviteByToken(token);
    if (!invite) throw new AppError("Invite not found", 404);

    // @ts-ignore
    if (invite.acceptedAt) throw new AppError("Invite already used", 400);
    // @ts-ignore
    if (invite.expiresAt < new Date()) throw new AppError("Invite expired", 400);

    return invite;
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.getInviteByToken(token);
    
    // Check if the user's email matches the invite email
    const { prisma } = require("../../config/database");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // @ts-ignore
    if (user?.email !== invite.email) {
      throw new AppError("This invite is not for your email address", 400);
    }

    try {
      // @ts-ignore
      await repo.acceptInvite(invite.id, invite.organizationId, userId, invite.role);
    } catch (err: any) {
      throw new AppError(err.message || "Failed to accept invite", 400);
    }
    return { success: true };
  }
}
