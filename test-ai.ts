import { config } from "dotenv";
config({ path: "./apps/server/.env" });

import { analyzeResumeText } from "./apps/server/src/modules/ai/resume.service";

async function test() {
  try {
    const res = await analyzeResumeText("John Doe, Software Engineer. 10 years of experience in Node.js and React.");
    console.log("SUCCESS:", res);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();
