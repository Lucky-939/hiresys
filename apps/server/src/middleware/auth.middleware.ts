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
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      throw new AppError("No token provided", 401);
    }
    
    // Check blocklist
    const { redis } = require("../config/redis");
    const isBlocked = await redis.get(`bl_${token}`);
    if (isBlocked) {
      throw new AppError("Invalid or expired token", 401);
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
    };

    const { prisma } = require("../config/database");
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      throw new AppError("Invalid or expired session. Please log in again.", 401);
    }

    req.userId = user.id;
    (req as any).user = user;

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    if (err instanceof AppError) return next(err);
    next(new AppError("Invalid or expired token", 401));
  }
}
