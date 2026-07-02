"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const errors_1 = require("../utils/errors");
function errorMiddleware(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }
    if (err.name === "PrismaClientValidationError") {
        return res.status(400).json({
            success: false,
            message: "Invalid data provided. Please check the fields and try again.",
        });
    }
    console.error("Unexpected error:", err);
    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
}
