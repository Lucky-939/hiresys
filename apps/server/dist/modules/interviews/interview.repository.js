"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewRepository = void 0;
const database_1 = require("../../config/database");
class InterviewRepository {
    create(data) {
        return database_1.prisma.interview.create({
            data,
            include: { createdBy: { select: { id: true, name: true, email: true } } },
        });
    }
    findByOrg(organizationId) {
        return database_1.prisma.interview.findMany({
            where: { organizationId },
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
        });
    }
    findById(id) {
        return database_1.prisma.interview.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                candidate: { select: { id: true, name: true, email: true } }
            },
        });
    }
    update(id, data) {
        return database_1.prisma.interview.update({ where: { id }, data });
    }
    delete(id) {
        return database_1.prisma.interview.delete({ where: { id } });
    }
}
exports.InterviewRepository = InterviewRepository;
