"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.logout = logout;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
const auth_service_1 = require("./auth.service");
const service = new auth_service_1.AuthService();
async function register(req, res, next) {
    try {
        const { name, email, password } = req.body;
        const result = await service.register(name, email, password);
        res.status(201).json({ success: true, ...result });
    }
    catch (err) {
        next(err); // passes error to errorMiddleware
    }
}
async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const result = await service.login(email, password);
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
}
async function logout(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
            await service.logout(token);
        }
        res.json({ success: true, message: "Logged out successfully" });
    }
    catch (err) {
        next(err);
    }
}
async function requestPasswordReset(req, res, next) {
    try {
        const { email } = req.body;
        const result = await service.requestPasswordReset(email);
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
}
async function resetPassword(req, res, next) {
    try {
        const { token, password } = req.body;
        const result = await service.resetPassword(token, password);
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
}
