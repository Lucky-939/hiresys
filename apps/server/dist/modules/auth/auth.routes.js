"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post("/register", (0, validate_middleware_1.validateRequest)([
    { field: "name", required: true, type: "string", minLength: 2 },
    { field: "email", required: true, type: "string", minLength: 5 },
    { field: "password", required: true, type: "string", minLength: 8 },
]), auth_controller_1.register);
exports.authRoutes.post("/login", (0, validate_middleware_1.validateRequest)([
    { field: "email", required: true, type: "string", minLength: 5 },
    { field: "password", required: true, type: "string", minLength: 1 },
]), auth_controller_1.login);
exports.authRoutes.post("/logout", auth_controller_1.logout);
exports.authRoutes.post("/forgot-password", (0, validate_middleware_1.validateRequest)([{ field: "email", required: true, type: "string" }]), auth_controller_1.requestPasswordReset);
exports.authRoutes.post("/reset-password", (0, validate_middleware_1.validateRequest)([
    { field: "token", required: true, type: "string" },
    { field: "password", required: true, type: "string", minLength: 8 }
]), auth_controller_1.resetPassword);
