-- AlterTable
ALTER TABLE "InterviewReport" ADD COLUMN     "snapshotCodeSubmitted" TEXT,
ADD COLUMN     "snapshotInterviewTitle" TEXT,
ADD COLUMN     "snapshotLanguage" TEXT,
ADD COLUMN     "snapshotQuestions" JSONB,
ADD COLUMN     "snapshotResumeScore" INTEGER;
