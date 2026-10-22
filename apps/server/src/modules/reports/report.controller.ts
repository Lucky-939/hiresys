import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { InterviewRepository } from "../interviews/interview.repository";
import { OrgRepository } from "../organizations/org.repository";
import { generateReport, getReportByInterviewId } from "./report.service";
import { AppError } from "../../utils/errors";

import { InterviewService } from "../interviews/interview.service";

const interviewService = new InterviewService();

async function validateInterviewAccess(interviewId: string, userId: string) {
  return interviewService.assertInterviewer(interviewId, userId);
}

export async function createReport(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const interviewId = req.params.interviewId as string;
    const interview = await validateInterviewAccess(interviewId, req.userId!);

    if (interview.status !== "COMPLETED") {
      throw new AppError(
        "Report can only be generated for completed interviews",
        400,
      );
    }

    const {
      codeSubmitted = "",
      language = "javascript",
      questionsAsked = [],
      resumeScore,
      interviewNotes = "",
    } = req.body;

    const report = await generateReport(interviewId, {
      interviewTitle: interview.title,
      codeSubmitted,
      language,
      questionsAsked,
      resumeScore,
      interviewNotes,
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

export async function getReport(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const interviewId = req.params.interviewId as string;
    await validateInterviewAccess(interviewId, req.userId!);

    const report = await getReportByInterviewId(interviewId);
    if (!report) throw new AppError("Report not found for this interview", 404);

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}
