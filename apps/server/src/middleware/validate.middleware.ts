import { Request, Response, NextFunction } from "express";

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "array";
  minLength?: number;
}

export function validateRequest(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required && (value === undefined || value === null || value === "")) {
        errors.push(`Field '${rule.field}' is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rule.type === "array" && !Array.isArray(value)) {
          errors.push(`Field '${rule.field}' must be an array`);
        } else if (rule.type !== "array" && typeof value !== rule.type) {
          errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
        }

        if (rule.minLength && typeof value === "string" && value.length < rule.minLength) {
          errors.push(`Field '${rule.field}' must be at least ${rule.minLength} characters long`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    next();
  };
}
