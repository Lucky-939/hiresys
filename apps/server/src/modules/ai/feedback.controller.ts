import { Request, Response, NextFunction } from "express";
import { generateCodeFeedback } from "./feedback.service";
import { InterviewService } from "../interviews/interview.service";
import { AppError } from "../../utils/errors";
import { AuthRequest } from "../../middleware/auth.middleware";

const interviewService = new InterviewService();

export async function getCodeFeedback(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { code, language, interviewId } = req.body;
    if (!code || !language)
      throw new AppError("code and language are required", 400);
    if (code.trim().length < 10)
      throw new AppError("Code is too short to analyze", 400);

    if (interviewId && req.userId) {
      const interview = await interviewService.getById(interviewId, req.userId);
      if (interview.status === "COMPLETED") {
        throw new AppError("Completed interviews cannot use AI", 403);
      }
    }

    const feedback = await generateCodeFeedback(code, language);
    res.json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
}
