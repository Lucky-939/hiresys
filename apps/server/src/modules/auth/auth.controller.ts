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

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
