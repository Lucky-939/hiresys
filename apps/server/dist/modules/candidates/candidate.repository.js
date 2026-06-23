"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateRepository = void 0;
const database_1 = require("../../config/database");
class CandidateRepository {
    async create(data) {
        return database_1.prisma.candidate.create({ data });
    }
    async findById(id) {
        return database_1.prisma.candidate.findUnique({
            where: { id },
            include: {
                interviews: {
                    include: {
                        report: true,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });
    }
    async findByOrg(organizationId) {
        return database_1.prisma.candidate.findMany({
            where: { organizationId },
            include: {
                interviews: {
                    include: {
                        report: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
    async findByEmail(organizationId, email) {
        return database_1.prisma.candidate.findUnique({
            where: {
                organizationId_email: {
                    organizationId,
                    email,
                },
            },
        });
    }
    async update(id, data) {
        return database_1.prisma.candidate.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return database_1.prisma.candidate.delete({
            where: { id },
        });
    }
}
exports.CandidateRepository = CandidateRepository;
