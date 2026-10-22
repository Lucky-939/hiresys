import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { redis } from "../src/config/redis";
import { CandidateService } from "../src/modules/candidates/candidate.service";
import { __setTestTransporter, generateOutcomeEmailHtml } from "../src/utils/email";

const prisma = new PrismaClient();
const candidateService = new CandidateService();
const API_BASE = "http://localhost:5000/api";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${status}] ${name}`);
  if (details) {
    console.log(`       Details: ${typeof details === "string" ? details : JSON.stringify(details)}`);
  }
  if (!passed && error) {
    console.log(`       Error: ${error}`);
  }
}

async function run() {
  console.log("================================================================================");
  console.log("       STEP 9 VERIFICATION: OUTCOME EMAILS (HUMAN-TRIGGERED ONLY)                ");
  console.log("================================================================================\n");

  const runId = Date.now();
  const testOrgSlug = `test-org-step9-${runId}`;

  // 0. Setup Organization, Stages, Job and Actors
  console.log("[Setup] Initializing test organization, stages, job and actors...");
  const org = await prisma.organization.create({
    data: {
      name: `Step 9 Outcome Org ${runId}`,
      slug: testOrgSlug,
    },
  });

  const appliedStage = await prisma.pipelineStage.create({
    data: {
      name: "Applied",
      order: 1,
      type: "STANDARD",
      organizationId: org.id,
    },
  });

  const interviewingStage = await prisma.pipelineStage.create({
    data: {
      name: "Interviewing",
      order: 2,
      type: "STANDARD",
      organizationId: org.id,
    },
  });

  const hiredStage = await prisma.pipelineStage.create({
    data: {
      name: "Hired",
      order: 3,
      type: "POSITIVE_TERMINAL",
      organizationId: org.id,
    },
  });

  const rejectedStage = await prisma.pipelineStage.create({
    data: {
      name: "Rejected",
      order: 4,
      type: "NEGATIVE_TERMINAL",
      organizationId: org.id,
    },
  });

  const defaultHash = await bcrypt.hash("TestPass123!", 10);

  // Recruiter
  const recruiter = await prisma.user.create({
    data: {
      name: "Alice Recruiter",
      email: `recruiter-${runId}@step9.com`,
      password: defaultHash,
      emailVerified: new Date(),
    },
  });
  await prisma.organizationMember.create({
    data: { userId: recruiter.id, organizationId: org.id, role: "RECRUITER" },
  });

  const job = await prisma.job.create({
    data: {
      title: "Senior Full Stack Engineer",
      description: "Looking for an experienced full stack engineer.",
      organizationId: org.id,
      createdById: recruiter.id,
      status: "OPEN",
    },
  });

  // Interviewer
  const interviewer = await prisma.user.create({
    data: {
      name: "Bob Interviewer",
      email: `interviewer-${runId}@step9.com`,
      password: defaultHash,
      emailVerified: new Date(),
    },
  });
  await prisma.organizationMember.create({
    data: { userId: interviewer.id, organizationId: org.id, role: "INTERVIEWER" },
  });

  // Candidate Role User
  const candUser = await prisma.user.create({
    data: {
      name: "Charlie Candidate",
      email: `candidate-user-${runId}@step9.com`,
      password: defaultHash,
      emailVerified: new Date(),
    },
  });
  await prisma.organizationMember.create({
    data: { userId: candUser.id, organizationId: org.id, role: "CANDIDATE" },
  });

  // Member Role User
  const memberUser = await prisma.user.create({
    data: {
      name: "Dave Member",
      email: `member-${runId}@step9.com`,
      password: defaultHash,
      emailVerified: new Date(),
    },
  });
  await prisma.organizationMember.create({
    data: { userId: memberUser.id, organizationId: org.id, role: "MEMBER" },
  });

  const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret";
  const recruiterToken = jwt.sign({ sub: recruiter.id, email: recruiter.email }, jwtSecret);
  const interviewerToken = jwt.sign({ sub: interviewer.id, email: interviewer.email }, jwtSecret);
  const candidateToken = jwt.sign({ sub: candUser.id, email: candUser.email }, jwtSecret);
  const memberToken = jwt.sign({ sub: memberUser.id, email: memberUser.email }, jwtSecret);

  // Candidate in CRM
  const candidate1 = await prisma.candidate.create({
    data: {
      name: "Test Candidate One",
      email: `cand1-${runId}@example.com`,
      organizationId: org.id,
      jobId: job.id,
      stageId: appliedStage.id,
      resumeScore: 88,
      atsScore: 92,
      resumeText: "Experienced engineer with React and Node.js expertise.",
    },
  });

  // Mock Transporter setup in-process
  const sentEmails: any[] = [];
  const mockTransporter: any = {
    sendMail: async (mailOptions: any) => {
      sentEmails.push(mailOptions);
      return { messageId: `mock-step9-${Date.now()}` };
    },
  };
  __setTestTransporter(mockTransporter);

  console.log("[Setup] Test fixtures created.\n");

  // ============================================================================
  // TEST 1: The endpoint refuses INTERVIEWER and CANDIDATE roles with 403
  // ============================================================================
  try {
    let interviewerRefused = false;
    let candidateRefused = false;
    let memberRefused = false;

    // Test interviewer
    try {
      await axios.post(
        `${API_BASE}/candidates/${candidate1.id}/outcome-email`,
        { subject: "Outcome", message: "Moving forward" },
        { headers: { Authorization: `Bearer ${interviewerToken}` } }
      );
    } catch (err: any) {
      if (err.response?.status === 403) interviewerRefused = true;
      else console.log("Interviewer status:", err.response?.status);
    }

    // Test candidate role
    try {
      await axios.post(
        `${API_BASE}/candidates/${candidate1.id}/outcome-email`,
        { subject: "Outcome", message: "Moving forward" },
        { headers: { Authorization: `Bearer ${candidateToken}` } }
      );
    } catch (err: any) {
      if (err.response?.status === 403) candidateRefused = true;
      else console.log("Candidate status:", err.response?.status);
    }

    // Test regular member
    try {
      await axios.post(
        `${API_BASE}/candidates/${candidate1.id}/outcome-email`,
        { subject: "Outcome", message: "Moving forward" },
        { headers: { Authorization: `Bearer ${memberToken}` } }
      );
    } catch (err: any) {
      if (err.response?.status === 403) memberRefused = true;
    }

    const passed = interviewerRefused && candidateRefused && memberRefused;
    recordTest(
      "Endpoint refuses INTERVIEWER and CANDIDATE roles with 403",
      passed,
      passed ? undefined : "One or more non-recruiter roles were not refused with 403",
      { interviewerRefused, candidateRefused, memberRefused }
    );
  } catch (err: any) {
    recordTest("Endpoint refuses INTERVIEWER and CANDIDATE roles with 403", false, err.message);
  }

  // ============================================================================
  // TEST 2: Changing a stage to Hired or Rejected sends nothing
  // ============================================================================
  try {
    sentEmails.length = 0;

    // Candidate 2 for Hired decision
    const candidate2 = await prisma.candidate.create({
      data: {
        name: "Test Candidate Two",
        email: `cand2-${runId}@example.com`,
        organizationId: org.id,
        jobId: job.id,
        stageId: interviewingStage.id,
      },
    });

    // Make hiring decision: HIRED
    await candidateService.makeHiringDecision(candidate2.id, "HIRED", "Offer approved by team", recruiter.id);
    const emailsAfterHired = sentEmails.length;

    // Candidate 3 for Rejected decision
    const candidate3 = await prisma.candidate.create({
      data: {
        name: "Test Candidate Three",
        email: `cand3-${runId}@example.com`,
        organizationId: org.id,
        jobId: job.id,
        stageId: interviewingStage.id,
      },
    });

    // Make hiring decision: REJECTED
    await candidateService.makeHiringDecision(candidate3.id, "REJECTED", "Not a technical match", recruiter.id);
    const emailsAfterRejected = sentEmails.length;

    // Regular stage movement
    const candidate4 = await prisma.candidate.create({
      data: {
        name: "Test Candidate Four",
        email: `cand4-${runId}@example.com`,
        organizationId: org.id,
        jobId: job.id,
        stageId: appliedStage.id,
      },
    });
    await candidateService.moveCandidateStage(candidate4.id, interviewingStage.id, recruiter.id);
    const emailsAfterMove = sentEmails.length;

    const passed = emailsAfterHired === 0 && emailsAfterRejected === 0 && emailsAfterMove === 0;
    recordTest(
      "Changing candidate stage to Hired or Rejected sends nothing",
      passed,
      passed ? undefined : `Expected 0 emails, but got ${sentEmails.length}`,
      { emailsAfterHired, emailsAfterRejected, emailsAfterMove }
    );
  } catch (err: any) {
    recordTest("Changing candidate stage to Hired or Rejected sends nothing", false, err.message);
  }

  // ============================================================================
  // TEST 3: A send creates exactly one email and one timeline entry
  // ============================================================================
  let candidateForSend: any;
  try {
    sentEmails.length = 0;

    candidateForSend = await prisma.candidate.create({
      data: {
        name: "Eleanor Vance",
        email: `eleanor-${runId}@example.com`,
        organizationId: org.id,
        jobId: job.id,
        stageId: interviewingStage.id,
      },
    });

    const emailSubject = "Offer of Employment: Senior Full Stack Engineer";
    const emailMessage = "Dear Eleanor,\n\nWe are thrilled to offer you the position. We were thoroughly impressed by your background.\n\nWarm regards,\nThe Hiring Team";

    // Call service with test transporter injected
    const result = await candidateService.sendOutcomeEmail(candidateForSend.id, recruiter.id, {
      templateType: "OFFER",
      subject: emailSubject,
      message: emailMessage,
    });

    const emailCount = sentEmails.length;
    const sentEmail = sentEmails[0];

    // Check CandidateActivity timeline entry
    const activities = await prisma.candidateActivity.findMany({
      where: {
        candidateId: candidateForSend.id,
        type: "OUTCOME_EMAIL_SENT",
      },
    });

    const exactlyOneEmail = emailCount === 1;
    const correctRecipient = sentEmail?.to === candidateForSend.email;
    const exactlyOneActivity = activities.length === 1;
    const correctDescription = activities[0]?.description === `Outcome email sent by ${recruiter.name}`;
    const bodyNotStored = !activities[0]?.description.includes("We are thrilled to offer you the position");

    const passed = result.success === true && exactlyOneEmail && correctRecipient && exactlyOneActivity && correctDescription && bodyNotStored;

    recordTest(
      "A send creates exactly one email and one timeline entry",
      passed,
      passed ? undefined : "Send did not create exactly 1 email and 1 timeline entry",
      {
        emailCount,
        recipient: sentEmail?.to,
        activityCount: activities.length,
        activityDescription: activities[0]?.description,
        bodyNotStored,
      }
    );
  } catch (err: any) {
    recordTest("A send creates exactly one email and one timeline entry", false, err.message);
  }

  // ============================================================================
  // TEST 4: The template contains no score or notes fields
  // ============================================================================
  try {
    // 1. Structural check on generateOutcomeEmailHtml template
    const sampleHtml = generateOutcomeEmailHtml({
      to: "test@example.com",
      candidateName: "Candidate Test",
      jobTitle: "Software Engineer",
      orgName: "Acme Corp",
      subject: "Update",
      message: "Here is your outcome update.",
    });

    const forbiddenPlaceholders = [
      "resumeScore",
      "aiScore",
      "overallScore",
      "atsScore",
      "resumeAnalysis",
      "aiAnalysis",
      "interviewerNotes",
      "decisionNotes",
      "interviewReport",
    ];

    let placeholderLeaked = false;
    for (const ph of forbiddenPlaceholders) {
      if (sampleHtml.toLowerCase().includes(ph.toLowerCase())) {
        placeholderLeaked = true;
        console.log(`Leaked placeholder in template: ${ph}`);
      }
    }

    // 2. Hostile injection test: pass forbidden fields to generateOutcomeEmailHtml
    const hostilePayload: any = {
      to: "test@example.com",
      candidateName: "John Doe",
      jobTitle: "Dev",
      orgName: "TestOrg",
      subject: "Application Status",
      message: "Thank you for applying.",
      // Injected private properties
      score: 98,
      resumeScore: 92,
      atsScore: 89,
      aiAnalysis: "Secret AI evaluation notes: do not hire",
      interviewerNotes: "Interviewer marked: candidate failed system design",
      report: "Candidate has low confidence in algorithms",
      interviewReport: "Full internal evaluation summary #9988",
    };

    const hostileHtml = generateOutcomeEmailHtml(hostilePayload);

    const secretValues = [
      "98",
      "92",
      "89",
      "Secret AI evaluation notes",
      "failed system design",
      "low confidence in algorithms",
      "Full internal evaluation summary",
    ];

    let secretLeaked = false;
    for (const secret of secretValues) {
      if (hostileHtml.includes(secret)) {
        secretLeaked = true;
        console.log(`Hostile secret leaked into HTML: ${secret}`);
      }
    }

    // 3. Verify Ledger style: flat solid color, no linear-gradient
    const hasGradient = hostileHtml.includes("gradient");
    const hasFlatHeader = hostileHtml.includes("background-color: #0F6E56;");

    const passed = !placeholderLeaked && !secretLeaked && !hasGradient && hasFlatHeader;
    recordTest(
      "The template contains no score or notes fields",
      passed,
      passed ? undefined : "Template leaked private fields or contained gradients",
      { placeholderLeaked, secretLeaked, hasGradient, hasFlatHeader }
    );
  } catch (err: any) {
    recordTest("The template contains no score or notes fields", false, err.message);
  }

  // ============================================================================
  // TEST 5: The hourly limit returns 429
  // ============================================================================
  try {
    let rateLimited = false;
    let statusCode = 0;
    let errorMessage = "";

    // Test in-process service call for rate limit
    try {
      await candidateService.sendOutcomeEmail(candidateForSend.id, recruiter.id, {
        templateType: "OFFER",
        subject: "Duplicate attempt",
        message: "This should be blocked by hourly rate limit.",
      });
    } catch (err: any) {
      statusCode = err.statusCode || err.status || (err.message.includes("429") ? 429 : 500);
      errorMessage = err.message;
      if (statusCode === 429 || err.statusCode === 429) {
        rateLimited = true;
      }
    }

    // Also verify via HTTP endpoint that 429 is returned over wire
    let http429 = false;
    try {
      await axios.post(
        `${API_BASE}/candidates/${candidateForSend.id}/outcome-email`,
        {
          templateType: "OFFER",
          subject: "HTTP Duplicate attempt",
          message: "This should also be 429 over HTTP.",
        },
        { headers: { Authorization: `Bearer ${recruiterToken}` } }
      );
    } catch (err: any) {
      if (err.response?.status === 429) {
        http429 = true;
      }
    }

    // Ensure email count did not increase (still exactly 1)
    const emailCountAfterRateLimit = sentEmails.length;
    const passed = rateLimited && http429 && emailCountAfterRateLimit === 1;

    recordTest(
      "The hourly limit returns 429",
      passed,
      passed ? undefined : `Expected status 429 and 1 email, got service 429=${rateLimited}, http 429=${http429}, emails=${emailCountAfterRateLimit}`,
      { statusCode, errorMessage, http429, totalEmailsSent: emailCountAfterRateLimit }
    );
  } catch (err: any) {
    recordTest("The hourly limit returns 429", false, err.message);
  }

  // ============================================================================
  // TEST 6: Sending failure clears rate limit and lets recruiter retry
  // ============================================================================
  try {
    const candidateRetry = await prisma.candidate.create({
      data: {
        name: "Retry Candidate",
        email: `retry-${runId}@example.com`,
        organizationId: org.id,
        jobId: job.id,
        stageId: interviewingStage.id,
      },
    });

    // Temporarily inject failing mock transporter
    mockTransporter.sendMail = async () => {
      throw new Error("Simulated SMTP Connection Failure");
    };

    let firstAttemptFailed = false;
    try {
      await candidateService.sendOutcomeEmail(candidateRetry.id, recruiter.id, {
        subject: "Retry Test",
        message: "Initial failing attempt",
      });
    } catch (err: any) {
      if (err.statusCode === 500 || err.message.includes("Failed to send outcome email")) {
        firstAttemptFailed = true;
      }
    }

    // Restore working mock transporter
    mockTransporter.sendMail = async (mailOptions: any) => {
      sentEmails.push(mailOptions);
      return { messageId: `mock-retry-success-${Date.now()}` };
    };

    // Retry sending - should NOT be blocked by 429 because rate limit was rolled back
    let retrySucceeded = false;
    try {
      const res = await candidateService.sendOutcomeEmail(candidateRetry.id, recruiter.id, {
        subject: "Retry Test",
        message: "Successful retry attempt",
      });
      if (res.success === true) {
        retrySucceeded = true;
      }
    } catch (err: any) {
      console.log("Retry attempt failed with error:", err.message);
    }

    const passed = firstAttemptFailed && retrySucceeded;
    recordTest(
      "Delivery failure allows immediate retry without 429 rate limit lock",
      passed,
      passed ? undefined : "Delivery failure did not roll back rate limit key",
      { firstAttemptFailed, retrySucceeded }
    );
  } catch (err: any) {
    recordTest("Delivery failure allows immediate retry without 429 rate limit lock", false, err.message);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n================================================================================");
  console.log("                              SUMMARY RESULTS                                   ");
  console.log("================================================================================");
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`Total Tests : ${total}`);
  console.log(`Passed      : ${passedCount}`);
  console.log(`Failed      : ${failedCount}`);

  if (failedCount > 0) {
    console.log("\nFAILURES:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(` - ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log("\nALL STEP 9 REQUIREMENTS SUCCESSFULLY VERIFIED!");
    process.exit(0);
  }
}

run()
  .catch((err) => {
    console.error("FATAL ERROR IN SCRIPT:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
