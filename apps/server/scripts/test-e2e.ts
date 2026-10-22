import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API = "http://localhost:5000/api";

async function run() {
  console.log("Starting E2E Test...");

  // 1. Clean up
  await prisma.user.deleteMany({ where: { email: { in: ["admin@e2e.com", "candidate@e2e.com"] } } });
  await prisma.organization.deleteMany({ where: { name: "E2E Org" } });
  
  // 2. Register Admin via Prisma to bypass email verification
  const bcrypt = require("bcryptjs");
  const hashedAdmin = await bcrypt.hash("password123", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@e2e.com",
      password: hashedAdmin,
      emailVerified: new Date()
    }
  });

  // Login Admin
  const loginAdminRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@e2e.com", password: "password123" })
  });
  const regData = await loginAdminRes.json();
  const token = regData.token;
  console.log("Admin registered and logged in:", !!token);

  // 3. Create Org
  const orgRes = await fetch(`${API}/organizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ name: "E2E Org" })
  });
  const orgData = await orgRes.json();
  if (!orgData.data) console.log("Org creation failed:", orgData);
  const orgId = orgData.data.id;
  console.log("Org created:", orgId);

  // 4. Add Candidate
  const candRes = await fetch(`${API}/candidates`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${token}`,
      "x-organization-id": orgId
    },
    body: JSON.stringify({ name: "E2E Candidate", email: "candidate@e2e.com", organizationId: orgId })
  });
  const candData = await candRes.json();
  if (!candData.success) console.log("Candidate creation failed:", candData);
  console.log("Candidate created:", candData.success);

  // 5. Bypass password generation for testing by forcing a known password in DB
  const hashed = await bcrypt.hash("testpass123", 12);
  await prisma.user.update({
    where: { email: "candidate@e2e.com" },
    data: { password: hashed }
  });
  console.log("Forced candidate password to testpass123");

  // 6. Login as Candidate
  const loginRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "candidate@e2e.com", password: "testpass123" })
  });
  const loginData = await loginRes.json();
  const candToken = loginData.token;
  console.log("Candidate logged in:", loginData.success);

  // 7. Verify RBAC blocks Candidate from Dashboard APIs
  const dashRes = await fetch(`${API}/dashboard/${orgId}/stats`, {
    headers: { 
      "Authorization": `Bearer ${candToken}`,
      "x-organization-id": orgId
    }
  });
  console.log("Dashboard Stats status (should be 403):", dashRes.status);
  
  const teamRes = await fetch(`${API}/organizations/${orgId}/members`, {
    headers: { 
      "Authorization": `Bearer ${candToken}`,
      "x-organization-id": orgId
    }
  });
  console.log("Team Members status (should be 403):", teamRes.status);

  // 8. Create Interview (as Admin)
  const ivRes = await fetch(`${API}/interviews`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${token}`,
      "x-organization-id": orgId
    },
    body: JSON.stringify({ 
      title: "Test Interview", 
      description: "Test",
      candidateId: candData.data.id
    })
  });
  const ivData = await ivRes.json();
  const interviewId = ivData.data.id;
  console.log("Interview created:", interviewId);

  // 9. Verify Candidate CAN access Coding Room
  const roomRes = await fetch(`${API}/interviews/${interviewId}`, {
    headers: { 
      "Authorization": `Bearer ${candToken}`,
      "x-organization-id": orgId
    }
  });
  console.log("Coding Room status (should be 200):", roomRes.status);
}

run().catch(console.error);
