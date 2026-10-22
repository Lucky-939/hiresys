import { prisma } from "../src/config/database";
import { AuthService } from "../src/modules/auth/auth.service";
import { OrgService } from "../src/modules/organizations/org.service";

async function run() {
  console.log("=== Testing Real-World Organization Flow ===");
  const authService = new AuthService();
  const orgService = new OrgService();

  const timestamp = Date.now();
  const emailWithOrg = `lucky.founder.${timestamp}@example.com`;
  const companyName = "Acme Technologies";

  // Test 1: Register with company name
  console.log("\n[Test 1] Registering user with custom company name...");
  const regResult = await authService.register(
    "Lucky Bhoir",
    emailWithOrg,
    "SecurePassword123!",
    companyName
  );
  console.log("Registered user ID:", regResult.userId);

  const userWithOrg = await prisma.user.findUnique({
    where: { id: regResult.userId },
    include: {
      organizations: {
        include: {
          organization: {
            include: {
              pipelineStages: true,
            },
          },
        },
      },
    },
  });

  if (!userWithOrg) throw new Error("User was not found in DB");
  const membership = userWithOrg.organizations[0];
  if (!membership) throw new Error("Membership was not created");

  console.log("Organization Name:", membership.organization.name);
  console.log("Organization Slug:", membership.organization.slug);
  console.log("Member Role:", membership.role);
  console.log("Pipeline Stages Count:", membership.organization.pipelineStages.length);

  if (membership.organization.name !== companyName) {
    throw new Error(`Expected org name "${companyName}", got "${membership.organization.name}"`);
  }
  if (!membership.organization.slug.startsWith("acme-technologies")) {
    throw new Error(`Expected slug starting with acme-technologies, got ${membership.organization.slug}`);
  }
  if (membership.role !== "OWNER") {
    throw new Error(`Expected role OWNER, got ${membership.role}`);
  }
  if (membership.organization.pipelineStages.length !== 6) {
    throw new Error(`Expected 6 default pipeline stages, got ${membership.organization.pipelineStages.length}`);
  }

  const stageNames = membership.organization.pipelineStages.map((s) => s.name);
  console.log("Seeded Stages:", stageNames);
  if (!stageNames.includes("Applied") || !stageNames.includes("Hired") || !stageNames.includes("Rejected")) {
    throw new Error("Default stages missing key stages");
  }
  console.log("✓ Test 1 Passed: Company name and pipeline stages properly initialized!");

  // Test 2: Register without org name (e.g. invited user)
  console.log("\n[Test 2] Registering user without org name (invited flow)...");
  const emailWithoutOrg = `lucky.invited.${timestamp}@example.com`;
  const reg2 = await authService.register(
    "Invited Colleague",
    emailWithoutOrg,
    "SecurePassword123!"
  );

  const userWithoutOrg = await prisma.user.findUnique({
    where: { id: reg2.userId },
    include: { organizations: true },
  });

  if (userWithoutOrg?.organizations.length !== 0) {
    throw new Error(`Expected 0 organizations for invited user, got ${userWithoutOrg?.organizations.length}`);
  }
  console.log("✓ Test 2 Passed: No dummy organization created when omitted!");

  // Test 3: Create organization explicitly via OrgService & verify stages
  console.log("\n[Test 3] Creating org explicitly via OrgService...");
  const explicitOrg = await orgService.createOrg("TechNova Solutions", userWithoutOrg!.id);
  const fetchedExplicitOrg = await prisma.organization.findUnique({
    where: { id: explicitOrg.id },
    include: { pipelineStages: true, members: true },
  });
  if (fetchedExplicitOrg?.pipelineStages.length !== 6) {
    throw new Error(`Expected 6 pipeline stages on explicit org creation, got ${fetchedExplicitOrg?.pipelineStages.length}`);
  }
  console.log("✓ Test 3 Passed: Explicit org creation seeded all 6 pipeline stages!");

  // Test 4: Rename organization
  console.log("\n[Test 4] Renaming organization...");
  await orgService.updateOrgName(membership.organization.id, "Acme Global Industries", userWithOrg.id);
  const renamed = await prisma.organization.findUnique({ where: { id: membership.organization.id } });
  if (renamed?.name !== "Acme Global Industries") {
    throw new Error(`Expected Acme Global Industries, got ${renamed?.name}`);
  }
  console.log("✓ Test 4 Passed: Renamed successfully to:", renamed.name);

  // Clean up test data
  console.log("\nCleaning up test data...");
  await prisma.pipelineStage.deleteMany({
    where: { organizationId: { in: [membership.organization.id, explicitOrg.id] } },
  });
  await prisma.organizationMember.deleteMany({
    where: { organizationId: { in: [membership.organization.id, explicitOrg.id] } },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: [membership.organization.id, explicitOrg.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [userWithOrg.id, userWithoutOrg!.id] } },
  });

  console.log("\n=========================================");
  console.log("ALL REAL-WORLD ORGANIZATION FLOW TESTS PASSED!");
  console.log("=========================================");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
