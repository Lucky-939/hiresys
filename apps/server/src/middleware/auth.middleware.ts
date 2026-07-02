import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/errors";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("No token provided", 401);
    }

    const token = authHeader.split(" ")[1];
    
    // Check blocklist
    const { redis } = require("../config/redis");
    const isBlocked = await redis.get(`bl_${token}`);
    if (isBlocked) {
      throw new AppError("Invalid or expired token", 401);
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
    };
    req.userId = payload.sub;
    
    // Also assign req.user for express compatibility where needed
    (req as any).user = { id: payload.sub };

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    if (err instanceof AppError) return next(err);
    next(new AppError("Invalid or expired token", 401));
  }
}
