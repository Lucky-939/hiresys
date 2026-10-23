import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { generateFollowUpQuestions } from "./followup.service";

export async function getFollowUpQuestions(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { code, language, problemStatement, testSummary } = req.body;
    const result = await generateFollowUpQuestions(
      code,
      language,
      problemStatement,
      testSummary
    );
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
