"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const database_1 = require("../../config/database");
class AuthRepository {
    findByEmail(email) {
        return database_1.prisma.user.findUnique({ where: { email } });
    }
    async createUser(data) {
        return database_1.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({ data });
            const orgName = `${data.name}'s Org`;
            const orgSlug = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${user.id.slice(0, 5)}`;
            await tx.organization.create({
                data: {
                    name: orgName,
                    slug: orgSlug,
                    members: {
                        create: {
                            userId: user.id,
                            role: "OWNER",
                        },
                    },
                },
            });
            return user;
        });
    }
}
exports.AuthRepository = AuthRepository;
