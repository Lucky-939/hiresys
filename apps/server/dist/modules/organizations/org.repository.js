"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgRepository = void 0;
const database_1 = require("../../config/database");
class OrgRepository {
    create(data) {
        return database_1.prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: { name: data.name, slug: data.slug },
            });
            await tx.organizationMember.create({
                data: {
                    userId: data.ownerId,
                    organizationId: org.id,
                    role: "OWNER",
                },
            });
            return org;
        });
    }
    findById(id) {
        return database_1.prisma.organization.findUnique({
            where: { id },
            include: { members: { include: { user: true } } },
        });
    }
    findBySlug(slug) {
        return database_1.prisma.organization.findUnique({ where: { slug } });
    }
    findUserOrgs(userId) {
        return database_1.prisma.organization.findMany({
            where: { members: { some: { userId } } },
            include: { _count: { select: { interviews: true, members: true } } },
        });
    }
    // --- Members ---
    getMembers(organizationId) {
        return database_1.prisma.organizationMember.findMany({
            where: { organizationId },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "asc" },
        });
    }
    getMember(organizationId, userId) {
        return database_1.prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId } },
            include: { user: { select: { email: true } } },
        });
    }
    updateMemberRole(organizationId, userId, role) {
        return database_1.prisma.organizationMember.update({
            where: { userId_organizationId: { userId, organizationId } },
            data: { role },
        });
    }
    removeMember(organizationId, userId) {
        return database_1.prisma.organizationMember.delete({
            where: { userId_organizationId: { userId, organizationId } },
        });
    }
    // --- Invites ---
    // @ts-ignore Prisma client lock
    createInvite(data) {
        // @ts-ignore
        return database_1.prisma.orgInvite.create({ data });
    }
    // @ts-ignore Prisma client lock
    findInviteByToken(token) {
        // @ts-ignore
        return database_1.prisma.orgInvite.findUnique({
            where: { token },
            include: { organization: { select: { id: true, name: true } } },
        });
    }
    // @ts-ignore Prisma client lock
    findActiveInvite(email, organizationId) {
        // @ts-ignore
        return database_1.prisma.orgInvite.findFirst({
            where: {
                email,
                organizationId,
                acceptedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
    }
    // @ts-ignore Prisma client lock
    acceptInvite(inviteId, organizationId, userId, role) {
        return database_1.prisma.$transaction(async (tx) => {
            const existingMember = await tx.organizationMember.findUnique({
                where: {
                    userId_organizationId: {
                        userId,
                        organizationId,
                    },
                },
            });
            if (existingMember) {
                throw new Error("User is already a member of this organization");
            }
            // @ts-ignore
            await tx.orgInvite.update({
                where: { id: inviteId },
                data: { acceptedAt: new Date() },
            });
            return tx.organizationMember.create({
                data: {
                    userId,
                    organizationId,
                    // @ts-ignore
                    role,
                },
            });
        });
    }
}
exports.OrgRepository = OrgRepository;
