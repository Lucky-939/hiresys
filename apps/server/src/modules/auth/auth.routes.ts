import { Router } from "express";
import { register, login, logout, requestPasswordReset, resetPassword, verifyEmail } from "./auth.controller";
import { validateRequest } from "../../middleware/validate.middleware";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  validateRequest([
    { field: "name", required: true, type: "string", minLength: 2 },
    { field: "email", required: true, type: "string", minLength: 5 },
    { field: "password", required: true, type: "string", minLength: 8 },
  ]),
  register
);

authRoutes.post(
  "/verify-email",
  validateRequest([
    { field: "userId", required: true, type: "string" },
    { field: "code", required: true, type: "string", minLength: 6 },
  ]),
  verifyEmail
);

authRoutes.post(
  "/login",
  validateRequest([
    { field: "email", required: true, type: "string", minLength: 5 },
    { field: "password", required: true, type: "string", minLength: 1 },
  ]),
  login
);

authRoutes.post("/logout", logout);

authRoutes.post(
  "/forgot-password",
  validateRequest([{ field: "email", required: true, type: "string" }]),
  requestPasswordReset
);

authRoutes.post(
  "/reset-password",
  validateRequest([
    { field: "token", required: true, type: "string" },
    { field: "password", required: true, type: "string", minLength: 8 }
  ]),
  resetPassword
);

