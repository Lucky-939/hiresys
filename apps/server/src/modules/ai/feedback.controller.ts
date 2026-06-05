import { Request, Response, NextFunction } from "express";
import { generateCodeFeedback } from "./feedback.service";
import { AppError } from "../../utils/errors";

export async function getCodeFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { code, language } = req.body;
    if (!code || !language)
      throw new AppError("code and language are required", 400);
    if (code.trim().length < 10)
      throw new AppError("Code is too short to analyze", 400);

    const feedback = await generateCodeFeedback(code, language);
    res.json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
}
