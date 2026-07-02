import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";

const service = new AuthService();

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, email, password } = req.body;
    const result = await service.register(name, email, password);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err); // passes error to errorMiddleware
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, code } = req.body;
    const result = await service.verifyEmail(userId, code);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      await service.logout(token);
    }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

export async function requestPasswordReset(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const result = await service.requestPasswordReset(email);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    const result = await service.resetPassword(token, password);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
