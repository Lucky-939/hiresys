import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if ((err as any).name === "MulterError" || (err as any).code === "LIMIT_FILE_SIZE") {
    const isSize = (err as any).code === "LIMIT_FILE_SIZE";
    return res.status(isSize ? 413 : 400).json({
      success: false,
      message: isSize
        ? "Resume file size exceeds the 5 MB limit. Please upload a smaller file."
        : err.message,
    });
  }

  if (err.name === "PrismaClientValidationError") {
    return res.status(400).json({
      success: false,
      message: "Invalid data provided. Please check the fields and try again.",
    });
  }

  console.error("Unexpected error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
