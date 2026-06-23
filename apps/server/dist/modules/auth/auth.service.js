"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_repository_1 = require("./auth.repository");
const errors_1 = require("../../utils/errors");
const repo = new auth_repository_1.AuthRepository();
class AuthService {
    async register(name, email, password) {
        const existing = await repo.findByEmail(email);
        if (existing) {
            throw new errors_1.AppError("An account with this email already exists", 409);
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        await repo.createUser({ name, email, password: hashedPassword });
        return { message: "Account created successfully" };
    }
    async login(email, password) {
        const user = await repo.findByEmail(email);
        if (!user || !user.password) {
            throw new errors_1.AppError("Invalid email or password", 401);
        }
        const passwordMatches = await bcryptjs_1.default.compare(password, user.password);
        if (!passwordMatches) {
            throw new errors_1.AppError("Invalid email or password", 401);
        }
        const token = jsonwebtoken_1.default.sign({ sub: user.id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
        return { token, user: { id: user.id, name: user.name, email: user.email } };
    }
    async logout(token) {
        // Add token to blocklist in Redis for 7 days
        const decoded = jsonwebtoken_1.default.decode(token);
        if (decoded && decoded.exp) {
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
            if (expiresIn > 0) {
                const { redis } = require("../../config/redis");
                await redis.setex(`bl_${token}`, expiresIn, "true");
            }
        }
        return { message: "Logged out successfully" };
    }
    async requestPasswordReset(email) {
        const user = await repo.findByEmail(email);
        if (!user)
            return { message: "If an account exists, a reset link has been sent." };
        const token = jsonwebtoken_1.default.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        const { redis } = require("../../config/redis");
        await redis.setex(`reset_${token}`, 3600, user.id);
        console.log(`[Email Mock] Password reset link: ${process.env.CLIENT_URL}/reset-password?token=${token}`);
        return { message: "If an account exists, a reset link has been sent." };
    }
    async resetPassword(token, newPassword) {
        const { redis } = require("../../config/redis");
        const userId = await redis.get(`reset_${token}`);
        if (!userId)
            throw new errors_1.AppError("Invalid or expired reset token", 400);
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
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
exports.AuthService = AuthService;
