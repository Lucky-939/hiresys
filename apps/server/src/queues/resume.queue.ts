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
    const { jobId, resumeText } = job.data;
    console.log(`Processing resume job: ${jobId}`);

    try {
      const feedback = await analyzeResumeText(resumeText);

      await setCache(
        `resume-result:${jobId}`,
        { status: "completed", data: feedback },
        60 * 60,
      );

      console.log(`Resume job completed: ${jobId}`);
      return feedback;
    } catch (err) {
      await setCache(
        `resume-result:${jobId}`,
        { status: "failed", error: "Analysis failed. Please try again." },
        60 * 60,
      );
      throw err;
    }
  },
  { connection },
);

resumeWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

resumeWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
