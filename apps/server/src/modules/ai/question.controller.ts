import { Request, Response, NextFunction } from "express";
import { generateInterviewQuestions } from "./question.service";
import { InterviewService } from "../interviews/interview.service";
import { AppError } from "../../utils/errors";
import { AuthRequest } from "../../middleware/auth.middleware";

const interviewService = new InterviewService();

export async function getQuestions(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { role, difficulty, count, interviewId } = req.body;

    if (!role || !difficulty) {
      throw new AppError("role and difficulty are required", 400);
    }

    if (interviewId && req.userId) {
      const interview = await interviewService.getById(interviewId, req.userId);
      if (interview.status === "COMPLETED") {
        throw new AppError("Completed interviews cannot use AI", 403);
      }
    }

    const questions = await generateInterviewQuestions(
      role,
      difficulty,
      count || 5,
    );

    res.json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
}
