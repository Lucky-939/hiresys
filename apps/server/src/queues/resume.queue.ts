import { Queue, Worker, Job } from "bullmq";
import { analyzeResumeText } from "../modules/ai/resume.service";
import { setCache } from "../config/cache";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
};

export const resumeQueue = new Queue("resume-analysis", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const resumeWorker = new Worker(
  "resume-analysis",
  async (job: Job) => {
    const { jobId, resumeText, candidateId } = job.data;
    console.log(`Processing resume job: ${jobId} for candidate ${candidateId || 'none'}`);

    try {
      const feedback = await analyzeResumeText(resumeText);

      if (candidateId && feedback.score) {
        const { prisma } = require("../../config/database");
        await prisma.candidate.update({
          where: { id: candidateId },
          data: {
            resumeScore: feedback.score,
          }
        });
        
        await prisma.candidateActivity.create({
          data: {
            candidateId,
            type: "REPORT",
            description: `AI Resume Analysis completed (Score: ${feedback.score})`,
          }
        });
      }

      await setCache(
        `resume-result:${jobId}`,
        { status: "completed", data: feedback },
        60 * 60,
      );

      console.log(`Resume job completed: ${jobId}`);
      return feedback;
    } catch (err) {
      console.error(`Error processing resume job: ${jobId}`, err);
      throw err;
    }
  },
  { connection },
);

resumeWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

resumeWorker.on("failed", async (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
  
  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    const { jobId } = job.data;
    const errorMessage = err?.message || "Analysis failed. Please try again.";
    await setCache(
      `resume-result:${jobId}`,
      { status: "failed", error: errorMessage },
      60 * 60,
    );
    console.log(`Job ${job.id} permanently failed after ${job.attemptsMade} attempts.`);
  }
});
