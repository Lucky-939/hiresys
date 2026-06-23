"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
class DashboardService {
    async getStats(organizationId) {
        const cacheKey = `org:${organizationId}:dashboard:stats`;
        const cached = await redis_1.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const now = new Date();
        // Total candidates in org
        const totalCandidates = await database_1.prisma.candidate.count({
            where: { organizationId }
        });
        // Interviews this week
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const interviewsThisWeek = await database_1.prisma.interview.count({
            where: {
                organizationId,
                createdAt: { gte: startOfWeek }
            }
        });
        // Hired this month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const hiredThisMonth = await database_1.prisma.candidate.count({
            where: {
                organizationId,
                stage: "HIRED",
                updatedAt: { gte: startOfMonth }
            }
        });
        // Pending Decision
        const pendingDecision = await database_1.prisma.candidate.count({
            where: {
                organizationId,
                stage: {
                    notIn: ["HIRED", "REJECTED"]
                }
            }
        });
        const recentActivity = await database_1.prisma.candidateActivity.findMany({
            where: { candidate: { organizationId } },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { candidate: { select: { name: true } } }
        });
        const pipelineCounts = await database_1.prisma.candidate.groupBy({
            by: ['stage'],
            where: { organizationId },
            _count: { stage: true }
        });
        const stats = {
            totalCandidates,
            interviewsThisWeek,
            hiredThisMonth,
            pendingDecision,
            recentActivity: recentActivity.map(a => ({
                actor: a.candidate.name,
                action: a.description,
                time: a.createdAt
            })),
            pipelineCounts: pipelineCounts.reduce((acc, curr) => {
                acc[curr.stage] = curr._count.stage;
                return acc;
            }, {})
        };
        // Cache for 60 seconds
        await redis_1.redis.setex(cacheKey, 60, JSON.stringify(stats));
        return stats;
    }
}
exports.DashboardService = DashboardService;
