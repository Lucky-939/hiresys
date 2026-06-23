import { prisma } from "../../config/database";
import { redis } from "../../config/redis";

export class DashboardService {
  async getStats(organizationId: string) {
    const cacheKey = `org:${organizationId}:dashboard:stats`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    
    // Total candidates in org
    const totalCandidates = await prisma.candidate.count({
      where: { organizationId }
    });

    // Interviews this week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const interviewsThisWeek = await prisma.interview.count({
      where: {
        organizationId,
        createdAt: { gte: startOfWeek }
      }
    });

    // Hired this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const hiredThisMonth = await prisma.candidate.count({
      where: {
        organizationId,
        stage: "HIRED",
        updatedAt: { gte: startOfMonth }
      }
    });

    // Pending Decision
    const pendingDecision = await prisma.candidate.count({
      where: {
        organizationId,
        stage: {
          notIn: ["HIRED", "REJECTED"]
        }
      }
    });

    const recentActivity = await prisma.candidateActivity.findMany({
      where: { candidate: { organizationId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { candidate: { select: { name: true } } }
    });

    const pipelineCounts = await prisma.candidate.groupBy({
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
      }, {} as Record<string, number>)
    };

    // Cache for 60 seconds
    await redis.setex(cacheKey, 60, JSON.stringify(stats));

    return stats;
  }
}
