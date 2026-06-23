"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../utils/errors");
async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new errors_1.AppError("No token provided", 401);
        }
        const token = authHeader.split(" ")[1];
        // Check blocklist
        const { redis } = require("../../config/redis");
        const isBlocked = await redis.get(`bl_${token}`);
        if (isBlocked) {
            throw new errors_1.AppError("Invalid or expired token", 401);
        }
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.userId = payload.sub;
        // Also assign req.user for express compatibility where needed
        req.user = { id: payload.sub };
        next();
    }
    catch (err) {
        if (err instanceof errors_1.AppError)
            return next(err);
        next(new errors_1.AppError("Invalid or expired token", 401));
    }
}
