import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { redis } from "../src/config/redis";
import { InterviewService } from "../src/modules/interviews/interview.service";
import { CandidateService } from "../src/modules/candidates/candidate.service";
import { __setTestTransporter } from "../src/utils/email";
import { sanitizeRedirect } from "../src/utils/redirect";

const prisma = new PrismaClient();
const interviewService = new InterviewService();
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
  const status = passed ? "? PASS" : "? FAIL";
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
  console.log("      STEP 2 VERIFICATION: CANDIDATE PROVISIONING & SECURITY HARDENING          ");
  console.log("================================================================================\n");

  const runId = Date.now();
  const testOrgSlug = `test-org-step2-${runId}`;

  // 0. Setup Organization and Admin / Recruiter / Interviewer users
  console.log("[Setup] Initializing test organization and actors...");
  const org = await prisma.organization.create({
    data: {
      name: `Step 2 Hardening Org ${runId}`,
      slug: testOrgSlug,
    },
  });

  const stage = await prisma.pipelineStage.create({
    data: {
      name: "Applied",
      order: 1,
      organizationId: org.id,
    },
  });

  const interviewStage = await prisma.pipelineStage.create({
    data: {
      name: "Interviewing",
      order: 2,
      organizationId: org.id,
    },
  });

  const recruiterPasswordHash = await bcrypt.hash("RecruiterPass123!", 10);
  const recruiterUser = await prisma.user.create({
    data: {
      name: "Lead Recruiter",
      email: `recruiter-${runId}@step2.com`,
      password: recruiterPasswordHash,
      emailVerified: new Date(),
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: recruiterUser.id,
      organizationId: org.id,
      role: "RECRUITER",
    },
  });

  const interviewerUser = await prisma.user.create({
    data: {
      name: "Tech Interviewer",
      email: `interviewer-${runId}@step2.com`,
      password: recruiterPasswordHash,
      emailVerified: new Date(),
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: interviewerUser.id,
      organizationId: org.id,
      role: "INTERVIEWER",
    },
  });

  console.log(`[Setup] Org: ${org.id}, Recruiter: ${recruiterUser.id}, Interviewer: ${interviewerUser.id}\n`);

  // ============================================================================
  // TEST 1: Provision at scheduling time, not before (Public applicant / Candidate)
  // ============================================================================
  try {
    const candidateEmail = `public-applicant-${runId}@example.com`;
    // Create candidate (simulating public application or candidate entry)
    const candidate = await prisma.candidate.create({
      data: {
        name: "Alice Applicant",
        email: candidateEmail,
        organizationId: org.id,
        stageId: stage.id,
        source: "PUBLIC_APPLICATION",
      },
    });

    // Verify candidate has NO user account before scheduling
    const userBefore = await prisma.user.findFirst({
      where: { email: { equals: candidateEmail, mode: "insensitive" } },
    });

    const hasNoUserBefore = userBefore === null;

    // Recruiter schedules interview
    const scheduleResult = await interviewService.create({
      title: "Frontend Architecture Round",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      organizationId: org.id,
      userId: recruiterUser.id,
      candidateId: candidate.id,
      interviewerId: interviewerUser.id,
    });

    // Check that user account now exists
    const userAfter = await prisma.user.findFirst({
      where: { email: { equals: candidateEmail, mode: "insensitive" } },
      include: { organizations: true },
    });

    const accountCreatedNow =
      userAfter !== null &&
      userAfter.password !== null &&
      userAfter.emailVerified !== null;

    const hasCandidateMembership =
      userAfter?.organizations.some(
        (m) => m.organizationId === org.id && m.role === "CANDIDATE"
      ) ?? false;

    const inviteSent =
      scheduleResult.interview.candidateInviteSentAt !== null &&
      scheduleResult.interview.candidateInviteFailed === false;

    // Passwords must never appear in returned interview object
    const passwordNotInResponse =
      !("password" in (scheduleResult.interview as any)) &&
      !("tempPassword" in (scheduleResult.interview as any));

    const test1Passed =
      hasNoUserBefore &&
      accountCreatedNow &&
      hasCandidateMembership &&
      inviteSent &&
      passwordNotInResponse;

    recordTest(
      "Test 1: Public applicant with no account gets account at interview scheduling",
      test1Passed,
      test1Passed ? undefined : "Conditions not met for scheduling-time provisioning",
      {
        noUserBefore: hasNoUserBefore,
        accountCreatedAfter: accountCreatedNow,
        candidateRoleAssigned: hasCandidateMembership,
        inviteSent,
        passwordNotInResponse,
      }
    );
  } catch (err: any) {
    recordTest("Test 1: Public applicant with no account gets account at interview scheduling", false, err.message);
  }

  // ============================================================================
  // TEST 2: Candidate who is never interviewed has no user account
  // ============================================================================
  try {
    const neverInterviewedEmail = `never-interviewed-${runId}@example.com`;
    const candidate2 = await candidateService.createCandidate({
      name: "Bob Candidate",
      email: neverInterviewedEmail,
      organizationId: org.id,
      userId: recruiterUser.id,
    });

    // Check database User table
    const userCheck = await prisma.user.findFirst({
      where: { email: { equals: neverInterviewedEmail, mode: "insensitive" } },
    });

    const test2Passed = candidate2 !== null && userCheck === null;
    recordTest(
      "Test 2: Candidate never interviewed has no user account",
      test2Passed,
      test2Passed ? undefined : "User account was prematurely created for candidate",
      { candidateId: candidate2.id, userExistsInDB: userCheck !== null }
    );
  } catch (err: any) {
    recordTest("Test 2: Candidate never interviewed has no user account", false, err.message);
  }

  // ============================================================================
  // TEST 3: Existing user password hash unchanged after interview scheduling
  // ============================================================================
  try {
    const existingUserEmail = `existing-dev-${runId}@example.com`;
    const initialPasswordHash = await bcrypt.hash("PreExistingSecretHash999!", 12);

    const existingUser = await prisma.user.create({
      data: {
        name: "Eve Existing",
        email: existingUserEmail,
        password: initialPasswordHash,
        emailVerified: new Date(),
      },
    });

    // Add candidate profile for this existing user
    const candidate3 = await prisma.candidate.create({
      data: {
        name: "Eve Candidate Profile",
        email: existingUserEmail,
        organizationId: org.id,
        stageId: stage.id,
      },
    });

    // Schedule interview
    const sched3 = await interviewService.create({
      title: "Staff Systems Design",
      scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      organizationId: org.id,
      userId: recruiterUser.id,
      candidateId: candidate3.id,
      interviewerId: interviewerUser.id,
    });

    // Check user record
    const userAfterSched = await prisma.user.findUnique({
      where: { id: existingUser.id },
      include: { organizations: true },
    });

    const passwordHashUnchanged = userAfterSched?.password === initialPasswordHash;
    const hasCandidateRole = userAfterSched?.organizations.some(
      (m) => m.organizationId === org.id && m.role === "CANDIDATE"
    );

    const test3Passed = passwordHashUnchanged && Boolean(hasCandidateRole);
    recordTest(
      "Test 3: Existing user's password hash unchanged after scheduling",
      test3Passed,
      test3Passed ? undefined : "Password hash was modified or candidate role missing",
      {
        passwordHashUnchanged,
        candidateRoleAssigned: Boolean(hasCandidateRole),
        initialHashPrefix: initialPasswordHash.slice(0, 15),
        currentHashPrefix: userAfterSched?.password?.slice(0, 15),
      }
    );
  } catch (err: any) {
    recordTest("Test 3: Existing user's password hash unchanged after scheduling", false, err.message);
  }

  // ============================================================================
  // TEST 4: Team-member conflict & interviewer-equals-candidate refused (400)
  // ============================================================================
  try {
    // 4A: Team-member conflict
    // Candidate email matches interviewer's email in this org (with uppercase / trim)
    const candidateWithTeamEmail = await prisma.candidate.create({
      data: {
        name: "Collision Candidate",
        email: `  ${interviewerUser.email.toUpperCase()}  `,
        organizationId: org.id,
        stageId: stage.id,
      },
    });

    let teamCollisionRejected = false;
    let teamCollisionErrorMsg = "";
    try {
      await interviewService.create({
        title: "Conflict Round",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        organizationId: org.id,
        userId: recruiterUser.id,
        candidateId: candidateWithTeamEmail.id,
        interviewerId: recruiterUser.id,
      });
    } catch (err: any) {
      if (err.statusCode === 400 && err.message.includes("team member")) {
        teamCollisionRejected = true;
        teamCollisionErrorMsg = err.message;
      }
    }

    // 4B: Candidate equals Interviewer check
    // Create candidate not on team, but assign an interviewer whose email matches candidate email
    const candidate4B = await prisma.candidate.create({
      data: {
        name: "Self Interviewer",
        email: `samename-${runId}@example.com`,
        organizationId: org.id,
        stageId: stage.id,
      },
    });

    const interviewer4B = await prisma.user.create({
      data: {
        name: "Interviewer With Same Email",
        email: `  SAMENAME-${runId}@example.com  `,
        password: recruiterPasswordHash,
        emailVerified: new Date(),
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: interviewer4B.id,
        organizationId: org.id,
        role: "INTERVIEWER",
      },
    });

    let samePersonRejected = false;
    let samePersonErrorMsg = "";
    try {
      await interviewService.create({
        title: "Self Interview Round",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        organizationId: org.id,
        userId: recruiterUser.id,
        candidateId: candidate4B.id,
        interviewerId: interviewer4B.id,
      });
    } catch (err: any) {
      if (err.statusCode === 400 && err.message.includes("same person")) {
        samePersonRejected = true;
        samePersonErrorMsg = err.message;
      }
    }

    const test4Passed = teamCollisionRejected && samePersonRejected;
    recordTest(
      "Test 4: Team-member conflict & interviewer-equals-candidate refused (400, case-insensitive)",
      test4Passed,
      test4Passed ? undefined : "Validation did not reject conflict with HTTP 400",
      {
        teamCollisionRejected,
        teamCollisionMessage: teamCollisionErrorMsg,
        samePersonRejected,
        samePersonMessage: samePersonErrorMsg,
      }
    );
  } catch (err: any) {
    recordTest("Test 4: Team-member conflict & interviewer-equals-candidate refused", false, err.message);
  }

  // ============================================================================
  // TEST 5: Forced email failure test via test-only injection point
  // ============================================================================
  try {
    // Inject failing transporter in-process
    __setTestTransporter({
      sendMail: async () => {
        throw new Error("Simulated SMTP Connection Refused");
      },
    } as any);

    const failCandidateEmail = `failing-email-${runId}@example.com`;
    const candidate5 = await prisma.candidate.create({
      data: {
        name: "Grace FailTest",
        email: failCandidateEmail,
        organizationId: org.id,
        stageId: stage.id,
      },
    });

    // Schedule interview while email transport is failing
    const result5 = await interviewService.create({
      title: "Resilience Test Session",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      organizationId: org.id,
      userId: recruiterUser.id,
      candidateId: candidate5.id,
      interviewerId: interviewerUser.id,
    });

    // Revert transporter immediately
    __setTestTransporter(null);

    const interviewCreated = result5.interview && result5.interview.id !== undefined;
    const candidateInviteFailed = result5.interview.candidateInviteFailed === true;
    const interviewerInviteFailed = result5.interview.interviewerInviteFailed === true;
    const needsPasswordReset = result5.interview.needsPasswordReset === true;
    const warningProvided = typeof result5.warning === "string" && result5.warning.length > 0;
    const warningNoPassword = result5.warning ? !result5.warning.includes("pass") : true;

    const test5Passed =
      interviewCreated &&
      candidateInviteFailed &&
      interviewerInviteFailed &&
      needsPasswordReset &&
      warningProvided &&
      warningNoPassword;

    recordTest(
      "Test 5: Forced email failure still creates interview and flags failed email (no passwords leaked)",
      test5Passed,
      test5Passed ? undefined : "Email failure was not handled gracefully or flags missing",
      {
        interviewCreated,
        candidateInviteFailed,
        interviewerInviteFailed,
        needsPasswordReset,
        warning: result5.warning,
      }
    );

    // ============================================================================
    // TEST 6: Resend rate limiting (429 on 4th) & no password change for existing users
    // ============================================================================
    try {
      const interviewId = result5.interview.id;
      // Clean rate limit key for clean test
      await redis.del(`ratelimit:resend_invite:${interviewId}`);

      // Resend 1: should succeed and reset needsPasswordReset
      const resend1 = await interviewService.resendInvite(interviewId, recruiterUser.id);
      const resend1Success = resend1.interview.candidateInviteFailed === false;

      // Resend 2: should succeed
      const resend2 = await interviewService.resendInvite(interviewId, recruiterUser.id);
      const resend2Success = resend2.interview !== undefined;

      // Resend 3: should succeed
      const resend3 = await interviewService.resendInvite(interviewId, recruiterUser.id);
      const resend3Success = resend3.interview !== undefined;

      // Resend 4: should be rate-limited (HTTP 429)
      let rateLimited = false;
      let rateLimitMsg = "";
      try {
        await interviewService.resendInvite(interviewId, recruiterUser.id);
      } catch (err: any) {
        if (err.statusCode === 429) {
          rateLimited = true;
          rateLimitMsg = err.message;
        }
      }

      // Check reschedule without password modification
      const userBeforeResched = await prisma.user.findFirst({
        where: { email: { equals: failCandidateEmail, mode: "insensitive" } },
      });
      const hashBeforeResched = userBeforeResched?.password;

      // Reschedule interview
      const reschedResult = await interviewService.update(interviewId, recruiterUser.id, {
        scheduledAt: new Date(Date.now() + 259200000).toISOString(),
      });

      const userAfterResched = await prisma.user.findFirst({
        where: { email: { equals: failCandidateEmail, mode: "insensitive" } },
      });
      const passwordUntouchedOnReschedule = userAfterResched?.password === hashBeforeResched;

      const test6Passed =
        resend1Success &&
        resend2Success &&
        resend3Success &&
        rateLimited &&
        passwordUntouchedOnReschedule;

      recordTest(
        "Test 6: Resend rate limiting (429 on 4th) & rescheduling without touching password",
        test6Passed,
        test6Passed ? undefined : "Rate limit or reschedule check failed",
        {
          resend1Success,
          resend2Success,
          resend3Success,
          rateLimitedOn4th: rateLimited,
          rateLimitMsg,
          passwordUntouchedOnReschedule,
        }
      );
    } catch (err: any) {
      recordTest("Test 6: Resend rate limiting and reschedule", false, err.message);
    }
  } catch (err: any) {
    __setTestTransporter(null);
    recordTest("Test 5: Forced email failure", false, err.message);
  }

  // ============================================================================
  // TEST 7: Candidate minimal access (403 on protected endpoints) & Redirect tests
  // ============================================================================
  try {
    // 7A: Create candidate user and generate JWT token
    const candidateUserEmail = `candidate-jwt-${runId}@example.com`;
    const candUser = await prisma.user.create({
      data: {
        name: "Carol Candidate",
        email: candidateUserEmail,
        password: await bcrypt.hash("CandPass123!", 10),
        emailVerified: new Date(),
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: candUser.id,
        organizationId: org.id,
        role: "CANDIDATE",
      },
    });

    const candidateToken = jwt.sign(
      { sub: candUser.id, email: candUser.email },
      process.env.JWT_SECRET || "default_jwt_secret"
    );

    const authHeaders = {
      headers: { Authorization: `Bearer ${candidateToken}` },
    };

    // Test candidate 403 on protected routes:
    // 1) /api/dashboard
    // 2) /api/jobs/org/:id
    // 3) /api/candidates/org/:id
    // 4) /api/stages/org/:id
    // 5) /api/organizations/:id/members
    const endpoints = [
      { name: "Dashboard", url: `${API_BASE}/dashboard?orgId=${org.id}` },
      { name: "Jobs", url: `${API_BASE}/jobs/org/${org.id}` },
      { name: "Candidates", url: `${API_BASE}/candidates/org/${org.id}` },
      { name: "Stages", url: `${API_BASE}/stages/org/${org.id}` },
      { name: "Org Members", url: `${API_BASE}/organizations/${org.id}/members` },
    ];

    const endpointResults: Record<string, number> = {};
    let allEndpoints403 = true;

    for (const ep of endpoints) {
      try {
        await axios.get(ep.url, authHeaders);
        endpointResults[ep.name] = 200; // Should not happen
        allEndpoints403 = false;
      } catch (err: any) {
        const status = err.response?.status || 500;
        endpointResults[ep.name] = status;
        if (status !== 403) {
          allEndpoints403 = false;
        }
      }
    }

    // 7B: Post-login redirect sanitization unit tests
    const redirectTestCases = [
      { input: "https://evil.site", expected: "/dashboard" },
      { input: "//evil.site", expected: "/dashboard" },
      { input: "/\\evil.site", expected: "/dashboard" },
      { input: "%2F%2Fevil.site", expected: "/dashboard" },
      { input: "%5Cevil.site", expected: "/dashboard" },
      { input: "javascript:alert(1)", expected: "/dashboard" },
      { input: "\\evil.site", expected: "/dashboard" },
      { input: "/%2Fevil.site", expected: "/dashboard" },
      { input: "http://attacker.com/test", expected: "/dashboard" },
      { input: "data:text/html,<script>alert(1)</script>", expected: "/dashboard" },
      { input: "/dashboard", expected: "/dashboard" },
      { input: "/room/session-abc-123", expected: "/room/session-abc-123" },
      { input: "/invite/token-xyz-456", expected: "/invite/token-xyz-456" },
      { input: "/dashboard?tab=interviews", expected: "/dashboard?tab=interviews" },
      { input: "/room/cuid123?candidate=true", expected: "/room/cuid123?candidate=true" },
    ];

    let allRedirectsPass = true;
    const redirectFailures: any[] = [];

    for (const tc of redirectTestCases) {
      const sanitized = sanitizeRedirect(tc.input);
      if (sanitized !== tc.expected) {
        allRedirectsPass = false;
        redirectFailures.push({ input: tc.input, expected: tc.expected, got: sanitized });
      }
    }

    const test7Passed = allEndpoints403 && allRedirectsPass;
    recordTest(
      "Test 7: Candidate 403 access control & strict post-login redirect sanitization",
      test7Passed,
      test7Passed ? undefined : "One or more 403 checks or redirect sanitization tests failed",
      {
        endpoints403: endpointResults,
        redirectPassCount: `${redirectTestCases.length - redirectFailures.length}/${redirectTestCases.length}`,
        redirectFailures: redirectFailures.length > 0 ? redirectFailures : undefined,
      }
    );
  } catch (err: any) {
    recordTest("Test 7: Candidate 403 checks and redirects", false, err.message);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n================================================================================");
  console.log("                           VERIFICATION SUMMARY                                 ");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}\n`);

  for (const r of results) {
    console.log(`${r.passed ? "? PASS" : "? FAIL"} - ${r.name}`);
  }
  console.log("================================================================================");

  // Clean up test org & members
  try {
    await prisma.organization.delete({ where: { id: org.id } }).catch(() => {});
  } catch {}

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
