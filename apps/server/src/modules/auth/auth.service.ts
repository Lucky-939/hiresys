import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRepository } from "./auth.repository";
import { AppError } from "../../utils/errors";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../utils/email";

const repo = new AuthRepository();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class AuthService {
  async register(name: string, email: string, password: string) {
    const existing = await repo.findByEmail(email);
    if (existing) {
      throw new AppError("An account with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await repo.createUser({ name, email, password: hashedPassword });

    // Generate and send OTP
    const otp = generateOtp();
    const { redis } = require("../../config/redis");
    await redis.setex(`verify_${user.id}`, 600, otp); // Valid for 10 minutes

    await sendVerificationEmail(email, otp);

    return { message: "Account created successfully. Please verify your email.", userId: user.id };
  }

  async verifyEmail(userId: string, code: string) {
    const { redis } = require("../../config/redis");
    const storedOtp = await redis.get(`verify_${userId}`);

    if (!storedOtp || storedOtp !== code) {
      throw new AppError("Invalid or expired verification code", 400);
    }

    // Update user
    const { prisma } = require("../../config/database");
    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() }
    });

    // Delete OTP
    await redis.del(`verify_${userId}`);

    // Log user in
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async login(email: string, password: string) {
    const user = await repo.findByEmail(email);
    if (!user || !user.password) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.emailVerified) {
      throw new AppError("Please verify your email address before logging in.", 403);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async logout(token: string) {
    // Add token to blocklist in Redis for 7 days
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        const { redis } = require("../../config/redis");
        await redis.setex(`bl_${token}`, expiresIn, "true");
      }
    }
    return { message: "Logged out successfully" };
  }

  async requestPasswordReset(email: string) {
    const user = await repo.findByEmail(email);
    if (!user) return { message: "If an account exists, a reset link has been sent." };

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "1h" });
    const { redis } = require("../../config/redis");
    await redis.setex(`reset_${token}`, 3600, user.id);

    await sendPasswordResetEmail(email, token);
    return { message: "If an account exists, a reset link has been sent." };
  }

  async resetPassword(token: string, newPassword: string) {
    const { redis } = require("../../config/redis");
    const userId = await redis.get(`reset_${token}`);
    if (!userId) throw new AppError("Invalid or expired reset token", 400);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    // Update password
    const { prisma } = require("../../config/database");
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    await redis.del(`reset_${token}`);
    return { message: "Password has been reset successfully" };
  }
}
