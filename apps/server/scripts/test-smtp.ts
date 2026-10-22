import dotenv from "dotenv";
dotenv.config();

import { sendOutcomeEmail } from "../src/utils/email";

async function test() {
  try {
    console.log("Testing email send...");
    const res = await sendOutcomeEmail({
      to: "test-receiver@example.com",
      candidateName: "Test Candidate",
      jobTitle: "Software Engineer",
      orgName: "Test Org",
      subject: "Test Subject",
      message: "Test message body."
    });
    console.log("Send result:", res);
  } catch (err: any) {
    console.error("SEND FAILED ERROR:", err.message);
    if (err.code) console.error("Error Code:", err.code);
    if (err.command) console.error("Error Command:", err.command);
  }
}

test();
