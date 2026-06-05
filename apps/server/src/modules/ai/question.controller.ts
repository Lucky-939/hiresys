import { Request, Response, NextFunction } from "express";
import { generateInterviewQuestions } from "./question.service";
import { AppError } from "../../utils/errors";

export async function getQuestions(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { role, difficulty, count } = req.body;

    if (!role || !difficulty) {
      throw new AppError("role and difficulty are required", 400);
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
