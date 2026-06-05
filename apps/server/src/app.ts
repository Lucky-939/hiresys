import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorMiddleware } from "./middleware/error.middleware";
import { authRoutes } from "./modules/auth/auth.routes";
import { orgRoutes } from "./modules/organizations/org.routes";
import { interviewRoutes } from "./modules/interviews/interview.routes";
import { generateText } from "./modules/ai/ai.service";
import { aiRoutes } from "./modules/ai/ai.routes";

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use("/api/ai", aiRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/test", (_req, res) => res.json({ works: true }));

app.use("/api/auth", authRoutes);
app.use("/api/organizations", orgRoutes);
app.use("/api/interviews", interviewRoutes);

app.use(errorMiddleware);

export default app;
