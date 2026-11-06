import dotenv from "dotenv";
dotenv.config();

export const testConfig = {
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  browser: (process.env.BROWSER || "chrome").toLowerCase(),
  headless: process.env.HEADLESS === "true",
  defaultTimeoutMs: parseInt(process.env.DEFAULT_TIMEOUT_MS || "10000", 10),
  credentials: {
    validUser: {
      email: process.env.TEST_USER_EMAIL || "recruiter@hiresys.test",
      password: process.env.TEST_USER_PASSWORD || "TestPassword123!",
    },
    invalidUser: {
      email: "nonexistent_candidate@fakeorg.com",
      password: "WrongPassword_999",
    },
  },
};

