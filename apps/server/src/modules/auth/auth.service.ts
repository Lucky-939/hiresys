import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRepository } from "./auth.repository";
import { AppError } from "../../utils/errors";

const repo = new AuthRepository();

export class AuthService {
  async register(name: string, email: string, password: string) {
    const existing = await repo.findByEmail(email);
    if (existing) {
      throw new AppError("An account with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await repo.createUser({ name, email, password: hashedPassword });

    return { message: "Account created successfully" };
  }

  async login(email: string, password: string) {
    const user = await repo.findByEmail(email);
    if (!user || !user.password) {
      throw new AppError("Invalid email or password", 401);
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
}
