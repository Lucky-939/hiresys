"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRepository = void 0;
const database_1 = require("../../config/database");
class ReportRepository {
    create(data) {
        return database_1.prisma.interviewReport.create({
            data,
            include: {
                interview: {
                    select: { id: true, title: true, status: true },
                },
            },
        });
    }
    findByInterviewId(interviewId) {
        return database_1.prisma.interviewReport.findUnique({
            where: { interviewId },
            include: {
                interview: {
                    select: { id: true, title: true, status: true },
                },
            },
        });
    }
}
exports.ReportRepository = ReportRepository;
