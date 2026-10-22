import { PrismaClient } from "@prisma/client";
import { redis } from "../src/config/redis";
import { resumeQueue } from "../src/queues/resume.queue";

const prisma = new PrismaClient();
const API_BASE = "http://localhost:5000/api";

const validPdfBuffer = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Senior Software Engineer Resume Content) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000338 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n417\n%%EOF"
);

async function run() {
  console.log("================================================================================");
  console.log("            PUBLIC JOB PAGE & APPLY ENDPOINT SECURITY VERIFICATION              ");
  console.log("================================================================================");

  // 1. Setup Test Fixtures
  console.log("\n[Setup] Initializing test organization, pipeline stages, and jobs in database...");
  
  // Flush rate limits in Redis for clean test run
  const keys = await redis.keys("ratelimit:*");
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log("[Setup] Flushed Redis rate limit keys.");
  }

  let org = await prisma.organization.findFirst({ where: { name: "Security Verification Org" } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: "Security Verification Org", slug: "sec-verify-" + Date.now() },
    });
  }

  // Ensure first pipeline stage exists
  let stage1 = await prisma.pipelineStage.findFirst({
    where: { organizationId: org.id },
    orderBy: { order: "asc" },
  });
  if (!stage1) {
    stage1 = await prisma.pipelineStage.create({
      data: { name: "Applied", order: 1, organizationId: org.id },
    });
  }

  // Ensure recruiter user exists to own jobs
  let user = await prisma.user.findFirst({ where: { email: "recruiter@secverify.com" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Recruiter Admin",
        email: "recruiter@secverify.com",
        password: "hashedpassword",
        emailVerified: new Date(),
      },
    });
  }

  // Create OPEN job
  const openJob = await prisma.job.create({
    data: {
      title: "Senior Backend Engineer",
      department: "Infrastructure",
      location: "San Francisco, CA (Hybrid)",
      description: "We are seeking a senior backend engineer to scale our distributed systems.",
      status: "OPEN",
      organizationId: org.id,
      createdById: user.id,
    },
  });

  // Create DRAFT job
  const draftJob = await prisma.job.create({
    data: {
      title: "Staff Security Architect (Draft)",
      department: "Security",
      location: "Remote",
      description: "Internal draft position.",
      status: "DRAFT",
      organizationId: org.id,
      createdById: user.id,
    },
  });

  // Create CLOSED job
  const closedJob = await prisma.job.create({
    data: {
      title: "Product Designer (Closed)",
      department: "Design",
      location: "New York, NY",
      description: "This role has already been filled.",
      status: "CLOSED",
      organizationId: org.id,
      createdById: user.id,
    },
  });

  console.log(`[Setup] Created Jobs: OPEN=${openJob.id}, DRAFT=${draftJob.id}, CLOSED=${closedJob.id}`);

  // ============================================================================
  // TEST 1: Public Job Endpoint with NO AUTH & Internal Fields Sanitization
  // ============================================================================
  console.log("\n--- TEST 1: Public job endpoint works with NO AUTH and contains NO internal fields ---");
  const jobRes = await fetch(`${API_BASE}/public/jobs/${openJob.id}`);
  const jobStatus = jobRes.status;
  const jobData = await jobRes.json();

  console.log("HTTP Status:", jobStatus);
  console.log("Raw Response JSON:", JSON.stringify(jobData, null, 2));

  const hasInternalFields = [
    "createdById",
    "organizationId",
    "candidates",
    "createdBy",
    "createdAt",
    "updatedAt",
  ].some((field) => field in jobData.data);

  if (jobStatus === 200 && jobData.success && !hasInternalFields && jobData.data.organizationName) {
    console.log("RESULT: PASSED (Endpoint accessible without auth, returned public fields, zero internal IDs exposed)");
  } else {
    console.error("RESULT: FAILED (Exposed internal fields or unexpected status)");
  }

  // ============================================================================
  // TEST 2: Anti-Probing: Draft Job ID vs Nonexistent Job ID vs Closed Job ID
  // ============================================================================
  console.log("\n--- TEST 2: Anti-Probing: Draft job vs Nonexistent job vs Closed job return identical responses ---");
  const nonexistentId = "nonexistent-job-cuid-99999";
  const nonexistRes = await fetch(`${API_BASE}/public/jobs/${nonexistentId}`);
  const nonexistData = await nonexistRes.json();

  const draftRes = await fetch(`${API_BASE}/public/jobs/${draftJob.id}`);
  const draftData = await draftRes.json();

  const closedRes = await fetch(`${API_BASE}/public/jobs/${closedJob.id}`);
  const closedData = await closedRes.json();

  console.log("Nonexistent Job HTTP Status:", nonexistRes.status, "Body:", JSON.stringify(nonexistData));
  console.log("Draft Job HTTP Status:      ", draftRes.status, "Body:", JSON.stringify(draftData));
  console.log("Closed Job HTTP Status:     ", closedRes.status, "Body:", JSON.stringify(closedData));

  const isIdentical =
    nonexistRes.status === 404 &&
    draftRes.status === 404 &&
    closedRes.status === 404 &&
    JSON.stringify(nonexistData) === JSON.stringify(draftData) &&
    JSON.stringify(draftData) === JSON.stringify(closedData);

  if (isIdentical) {
    console.log("RESULT: PASSED (Draft, Closed, and Nonexistent IDs yield 100% identical 404 responses - anti-probing verified)");
  } else {
    console.error("RESULT: FAILED (Responses differ, allowing attackers to probe valid job IDs)");
  }

  // ============================================================================
  // TEST 3: Open Job Accepts Valid Application
  // ============================================================================
  console.log("\n--- TEST 3: Open job accepts valid application (Candidate created in first stage, linked to job, no user created) ---");
  const test3Ip = "198.51.100.11";
  const candidateEmail = "valid.candidate." + Date.now() + "@example.com";
  const form = new FormData();
  form.append("fullName", "Samantha Vance");
  form.append("email", candidateEmail);
  form.append("phone", "+1 415-555-2671");
  form.append("resume", new Blob([validPdfBuffer], { type: "application/pdf" }), "Samantha_Vance_Resume.pdf");

  const applyRes = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": test3Ip },
    body: form,
  });
  const applyStatus = applyRes.status;
  const applyData = await applyRes.json();
  console.log("HTTP Status:", applyStatus);
  console.log("Raw Response:", JSON.stringify(applyData));

  // Query database to verify candidate record
  const createdCandidate = await prisma.candidate.findFirst({
    where: { email: candidateEmail },
    include: { pipelineStage: true, activities: true },
  });

  const createdUserAccount = await prisma.user.findFirst({
    where: { email: candidateEmail },
  });

  console.log("Created Candidate Record in DB:", {
    id: createdCandidate?.id,
    name: createdCandidate?.name,
    email: createdCandidate?.email,
    source: createdCandidate?.source,
    createdById: createdCandidate?.createdById,
    jobId: createdCandidate?.jobId,
    stageName: createdCandidate?.pipelineStage?.name,
    stageOrder: createdCandidate?.pipelineStage?.order,
    activities: createdCandidate?.activities?.map((a) => a.description),
  });
  console.log("User Account in DB for this email:", createdUserAccount ? "VULNERABLE (User was created)" : "NONE (Correct - no user account created)");

  if (
    applyStatus === 201 &&
    applyData.success &&
    createdCandidate &&
    createdCandidate.source === "PUBLIC_APPLICATION" &&
    createdCandidate.createdById === null &&
    createdCandidate.jobId === openJob.id &&
    createdCandidate.stageId === stage1.id &&
    !createdUserAccount &&
    createdCandidate.activities.some((a) => a.description === "Applied via public job page")
  ) {
    console.log("RESULT: PASSED (Candidate created in stage 1, source=PUBLIC_APPLICATION, createdById=null, no user account, timeline activity logged)");
  } else {
    console.error("RESULT: FAILED (Candidate fields or stage assignment incorrect)");
  }

  // ============================================================================
  // TEST 4: Draft Job and Closed Job Reject Applications
  // ============================================================================
  console.log("\n--- TEST 4: Draft job and Closed job both reject applications ---");
  const test4Ip = "198.51.100.20";
  const draftForm = new FormData();
  draftForm.append("fullName", "Draft Applicant");
  draftForm.append("email", "draft.applicant." + Date.now() + "@example.com");
  draftForm.append("resume", new Blob([validPdfBuffer], { type: "application/pdf" }), "resume.pdf");

  const draftApplyRes = await fetch(`${API_BASE}/public/jobs/${draftJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": test4Ip },
    body: draftForm,
  });
  const draftApplyData = await draftApplyRes.json();
  console.log("Draft Job Apply Status:", draftApplyRes.status, "Body:", JSON.stringify(draftApplyData));

  const closedForm = new FormData();
  closedForm.append("fullName", "Closed Applicant");
  closedForm.append("email", "closed.applicant." + Date.now() + "@example.com");
  closedForm.append("resume", new Blob([validPdfBuffer], { type: "application/pdf" }), "resume.pdf");

  const closedApplyRes = await fetch(`${API_BASE}/public/jobs/${closedJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": test4Ip },
    body: closedForm,
  });
  const closedApplyData = await closedApplyRes.json();
  console.log("Closed Job Apply Status:", closedApplyRes.status, "Body:", JSON.stringify(closedApplyData));

  if (draftApplyRes.status === 404 && closedApplyRes.status === 404) {
    console.log("RESULT: PASSED (Both Draft and Closed jobs reject application attempts with 404)");
  } else {
    console.error("RESULT: FAILED (Draft or Closed job accepted application or returned wrong status)");
  }

  // ============================================================================
  // TEST 5: File named .pdf with Wrong Header is Rejected
  // ============================================================================
  console.log("\n--- TEST 5: File named .pdf with wrong header is rejected ---");
  const test5Ip = "198.51.100.30";
  const badHeaderForm = new FormData();
  badHeaderForm.append("fullName", "Spoof Tester");
  badHeaderForm.append("email", "spoof." + Date.now() + "@example.com");
  badHeaderForm.append("resume", new Blob(["This is a text file renamed to pdf!"], { type: "application/pdf" }), "fake.pdf");

  const badHeaderRes = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": test5Ip },
    body: badHeaderForm,
  });
  const badHeaderData = await badHeaderRes.json();
  console.log("HTTP Status:", badHeaderRes.status, "Body:", JSON.stringify(badHeaderData));

  if (badHeaderRes.status === 400 && badHeaderData.message?.includes("Invalid file signature")) {
    console.log("RESULT: PASSED (Binary magic-bytes header check rejected spoofed PDF)");
  } else {
    console.error("RESULT: FAILED (Spoofed PDF was not rejected with header validation error)");
  }

  // ============================================================================
  // TEST 6: Non-PDF File and Oversized File (>5 MB) are Rejected
  // ============================================================================
  console.log("\n--- TEST 6: Non-PDF file and oversized file (>5 MB) are rejected ---");
  const test6IpA = "198.51.100.41";
  const txtForm = new FormData();
  txtForm.append("fullName", "Text Tester");
  txtForm.append("email", "txt." + Date.now() + "@example.com");
  txtForm.append("resume", new Blob(["Plain text resume content"], { type: "text/plain" }), "resume.txt");

  const txtRes = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": test6IpA },
    body: txtForm,
  });
  const txtData = await txtRes.json();
  console.log("Non-PDF (.txt) Status:", txtRes.status, "Body:", JSON.stringify(txtData));

  // Oversized 5.5 MB buffer with separate IP so IP limiter never interferes
  const test6IpB = "198.51.100.42";
  const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024);
  oversizedBuffer.write("%PDF-1.4\n");
  const bigForm = new FormData();
  bigForm.append("fullName", "Big File Tester");
  bigForm.append("email", "big." + Date.now() + "@example.com");
  bigForm.append("resume", new Blob([oversizedBuffer], { type: "application/pdf" }), "oversized.pdf");

  const bigRes = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": test6IpB },
    body: bigForm,
  });
  const bigData = await bigRes.json();
  console.log("Oversized File (>5 MB) Status:", bigRes.status, "Body:", JSON.stringify(bigData));

  const isTxtRejected = txtRes.status === 400 && txtData.message?.includes("Only PDF files are allowed");
  const isBigRejected = (bigRes.status === 413 || bigRes.status === 400) && bigData.message?.includes("5 MB");

  if (isTxtRejected && isBigRejected) {
    console.log("RESULT: PASSED (Non-PDF rejected with 400; Oversized file rejected with clear status " + bigRes.status + " and message '" + bigData.message + "')");
  } else {
    console.error("RESULT: FAILED (Expected 400 for non-pdf and 413/400 for oversized, got txt=" + txtRes.status + ", big=" + bigRes.status + ")");
  }

  // ============================================================================
  // TEST 7: Duplicate Email on Same Job returns Generic Success (Race-Safe)
  // ============================================================================
  console.log("\n--- TEST 7: Duplicate email on same job returns generic success and creates NO second candidate ---");
  const test7Ip = "198.51.100.50";
  const dupForm = new FormData();
  dupForm.append("fullName", "Samantha Vance Duplicate");
  dupForm.append("email", candidateEmail); // Same email submitted in Test 3
  dupForm.append("resume", new Blob([validPdfBuffer], { type: "application/pdf" }), "Samantha_Vance_Resume.pdf");

  const dupRes = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": test7Ip },
    body: dupForm,
  });
  const dupData = await dupRes.json();
  console.log("HTTP Status:", dupRes.status, "Body:", JSON.stringify(dupData));

  const candidateCount = await prisma.candidate.count({
    where: { jobId: openJob.id, email: candidateEmail },
  });
  console.log("Candidate Count in DB for this job and email:", candidateCount);

  if (dupRes.status === 200 && dupData.success && candidateCount === 1) {
    console.log("RESULT: PASSED (Generic 200 success returned, candidate count strictly remains 1)");
  } else {
    console.error("RESULT: FAILED (Duplicate created or wrong status returned)");
  }

  // ============================================================================
  // TEST 8: Honeypot-Filled Submissions Create Nothing
  // ============================================================================
  console.log("\n--- TEST 8: Honeypot-filled submissions return generic success and create nothing in DB, no email, no queue job ---");
  const test8Ip = "198.51.100.60";
  const botEmail = "bot.scraper." + Date.now() + "@spam.com";
  
  // Snapshot queue jobs before submission
  const preJobs = await resumeQueue.getJobs(["waiting", "active", "delayed", "completed"]);
  const preJobCount = preJobs.length;

  const botForm = new FormData();
  botForm.append("fullName", "Bot Scraper");
  botForm.append("email", botEmail);
  botForm.append("website", "https://spam-marketing-service.biz/promo"); // Honeypot field
  botForm.append("resume", new Blob([validPdfBuffer], { type: "application/pdf" }), "resume.pdf");

  const botRes = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": test8Ip },
    body: botForm,
  });
  const botData = await botRes.json();
  console.log("Honeypot Submission HTTP Status:", botRes.status, "Body:", JSON.stringify(botData));

  const botCandidate = await prisma.candidate.findFirst({ where: { email: botEmail } });
  const postJobs = await resumeQueue.getJobs(["waiting", "active", "delayed", "completed"]);
  const botQueueJobs = postJobs.filter((j) => j.data?.resumeText?.includes("Bot Scraper") || (botCandidate && j.data?.candidateId === botCandidate.id));

  console.log("Candidate in DB for bot submission:", botCandidate ? "VULNERABLE (Created bot candidate)" : "NONE (Correct - bot ignored)");
  console.log("Queue Jobs enqueued for bot submission:", botQueueJobs.length);

  if (botRes.status === 200 && botData.success && !botCandidate && botQueueJobs.length === 0) {
    console.log("RESULT: PASSED (Honeypot returned generic 200 success, zero DB records created, no queue jobs enqueued)");
  } else {
    console.error("RESULT: FAILED (Honeypot submission created database records or enqueued jobs)");
  }

  // ============================================================================
  // TEST 9: IP Rate Limit (5 per IP) and Different IP Isolation
  // ============================================================================
  console.log("\n--- TEST 9: IP Rate Limit (5 per IP) and Different IP Isolation ---");
  const ipA = "203.0.113.195";
  console.log(`Sending submissions from IP A (${ipA})...`);

  let lastStatus = 0;
  let lastBody: any = null;

  for (let i = 1; i <= 6; i++) {
    const f = new FormData();
    f.append("fullName", `Applicant ${i}`);
    f.append("email", `ip.applicant.${i}.${Date.now()}@example.com`);
    f.append("resume", new Blob([validPdfBuffer], { type: "application/pdf" }), "resume.pdf");

    const r = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
      method: "POST",
      headers: { "X-Forwarded-For": ipA },
      body: f,
    });
    lastStatus = r.status;
    lastBody = await r.json();
    console.log(`  Submission #${i} from ${ipA}: Status=${lastStatus}`);
  }

  console.log("6th Request Status from IP A:", lastStatus, "Body:", JSON.stringify(lastBody));

  // Now test a different IP: IP B must NOT be blocked!
  const ipB = "198.51.100.70";
  console.log(`Immediately sending submission from DIFFERENT IP B (${ipB})...`);

  const formB = new FormData();
  formB.append("fullName", "Applicant from IP B");
  formB.append("email", `ip.b.applicant.${Date.now()}@example.com`);
  formB.append("resume", new Blob([validPdfBuffer], { type: "application/pdf" }), "resume.pdf");

  const resB = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": ipB },
    body: formB,
  });
  const statusB = resB.status;
  const bodyB = await resB.json();
  console.log(`Status from IP B (${ipB}):`, statusB, "Body:", JSON.stringify(bodyB));

  if (lastStatus === 429 && lastBody.message?.includes("Too many applications") && (statusB === 201 || statusB === 200)) {
    console.log("RESULT: PASSED (IP A blocked with 429 after 5 requests; IP B remains unblocked, verifying trust proxy isolation)");
  } else {
    console.error("RESULT: FAILED (Rate limit did not trigger 429 or blocked different IP)");
  }

  // ============================================================================
  // TEST 10: Per-Email Rate Limit (3 per 24h)
  // ============================================================================
  console.log("\n--- TEST 10: Per-Email Rate Limit (3 applications per email per day) ---");
  const spammerEmail = "spammer.applicant." + Date.now() + "@test.com";

  // We use different IP addresses to isolate the email rate limit from the IP rate limit
  let emailLastStatus = 0;
  let emailLastBody: any = null;

  for (let i = 1; i <= 4; i++) {
    const ef = new FormData();
    ef.append("fullName", `Spammer ${i}`);
    ef.append("email", spammerEmail);
    ef.append("resume", new Blob([validPdfBuffer], { type: "application/pdf" }), "resume.pdf");

    const er = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
      method: "POST",
      headers: { "X-Forwarded-For": `192.0.2.${100 + i}` },
      body: ef,
    });
    emailLastStatus = er.status;
    emailLastBody = await er.json();
    console.log(`  Submission #${i} for email '${spammerEmail}': Status=${emailLastStatus}`);
  }

  console.log("4th Submission Status for email:", emailLastStatus, "Body:", JSON.stringify(emailLastBody));

  if (emailLastStatus === 429 && emailLastBody.message?.includes("Too many applications submitted for this email")) {
    console.log("RESULT: PASSED (Per-email limit triggered 429 on 4th attempt)");
  } else {
    console.error("RESULT: FAILED (Per-email rate limiter did not trigger 429)");
  }

  // ============================================================================
  // TEST 11: Exactly One Resume Scoring Job Enqueued & Stage Did NOT Mutate
  // ============================================================================
  console.log("\n--- TEST 11: Exactly one resume-scoring job enqueued and candidate stage did not change after scoring ---");
  const test11Ip = "198.51.100.80";
  const test11Email = "ai.stage.test." + Date.now() + "@example.com";
  const form11 = new FormData();
  form11.append("fullName", "AI Invariant Tester");
  form11.append("email", test11Email);
  form11.append("resume", new Blob([validPdfBuffer], { type: "application/pdf" }), "resume.pdf");

  const res11 = await fetch(`${API_BASE}/public/jobs/${openJob.id}/apply`, {
    method: "POST",
    headers: { "X-Forwarded-For": test11Ip },
    body: form11,
  });
  const data11 = await res11.json();
  console.log("Submission Status:", res11.status, "Body:", JSON.stringify(data11));

  const candidate11 = await prisma.candidate.findFirst({
    where: { email: test11Email },
    include: { pipelineStage: true },
  });

  if (!candidate11) {
    console.error("RESULT: FAILED (Candidate was not created in DB)");
    return;
  }

  const initialStageId = candidate11.stageId;
  const initialStageName = candidate11.pipelineStage.name;
  console.log(`Candidate Created: ID=${candidate11.id}, Initial Stage=${initialStageName} (ID: ${initialStageId})`);

  // Query BullMQ queue to verify exactly one job enqueued
  const allQueueJobs = await resumeQueue.getJobs(["waiting", "active", "delayed", "completed", "failed"]);
  const candidateJobs = allQueueJobs.filter((j) => j.data?.candidateId === candidate11.id);
  console.log(`Matching Resume Scoring Jobs in BullMQ: ${candidateJobs.length}`);

  // Poll for job completion and candidate update
  console.log("Waiting for resume scoring worker to complete...");
  let finalCandidate: any = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    finalCandidate = await prisma.candidate.findUnique({
      where: { id: candidate11.id },
      include: { pipelineStage: true, activities: true },
    });
    if (finalCandidate?.resumeScore !== null || finalCandidate?.activities?.some((a: any) => a.type === "REPORT")) {
      break;
    }
  }

  console.log("Final Candidate State in DB:", {
    id: finalCandidate?.id,
    stageId: finalCandidate?.stageId,
    stageName: finalCandidate?.pipelineStage?.name,
    resumeScore: finalCandidate?.resumeScore,
    activities: finalCandidate?.activities?.map((a: any) => a.description),
  });

  const exactOneJob = candidateJobs.length === 1;
  const stageUnchanged = finalCandidate?.stageId === initialStageId;

  if (exactOneJob && stageUnchanged) {
    console.log("RESULT: PASSED (Exactly 1 job enqueued; Candidate stage remained strictly unchanged at '" + initialStageName + "' after scoring - 'AI never moves a candidate' rule verified)");
  } else {
    console.error("RESULT: FAILED (Job count=" + candidateJobs.length + ", stage changed: " + (finalCandidate?.stageId !== initialStageId) + ")");
  }

  console.log("\n================================================================================");
  console.log("                   ALL SECURITY VERIFICATION TESTS COMPLETED                    ");
  console.log("================================================================================");
  
  await prisma.$disconnect();
  await resumeQueue.close();
  process.exit(0);
}

run().catch((e) => {
  console.error("Verification script encountered fatal error:", e);
  process.exit(1);
});
