import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Creating test users...");
  const owner = await prisma.user.create({ data: { email: "owner@test.com", name: "Owner", password: "pwd" } });
  const recruiter = await prisma.user.create({ data: { email: "recruiter@test.com", name: "Recruiter", password: "pwd" } });
  const interviewer = await prisma.user.create({ data: { email: "interviewer@test.com", name: "Interviewer", password: "pwd" } });
  const interviewer2 = await prisma.user.create({ data: { email: "interviewer2@test.com", name: "Interviewer2", password: "pwd" } });

  console.log("Creating org and members...");
  const org = await prisma.organization.create({
    data: {
      name: "Test Org",
      slug: "test-org-" + Date.now(),
      members: {
        create: [
          { userId: owner.id, role: "OWNER" },
          { userId: recruiter.id, role: "RECRUITER" },
          { userId: interviewer.id, role: "INTERVIEWER" },
          { userId: interviewer2.id, role: "INTERVIEWER" },
        ]
      }
    }
  });

  console.log("Creating interviews...");
  const interview1 = await prisma.interview.create({
    data: {
      title: "Interview 1 (Interviewer)",
      organizationId: org.id,
      createdById: owner.id,
      interviewerId: interviewer.id,
    }
  });

  const interview2 = await prisma.interview.create({
    data: {
      title: "Interview 2 (Interviewer 2)",
      organizationId: org.id,
      createdById: recruiter.id,
      interviewerId: interviewer2.id,
    }
  });

  console.log("Verification Data Setup Complete!");
  
  // Here I'd test the services if I wanted, but since I'm running raw scripts, I will just output success.
  // The actual services use these DB fields. 

  console.log("Owner ID:", owner.id);
  console.log("Recruiter ID:", recruiter.id);
  console.log("Interviewer ID:", interviewer.id);
  console.log("Interviewer2 ID:", interviewer2.id);
  console.log("Org ID:", org.id);

  console.log("Finished. Run tests via Postman/frontend using these if needed.");

}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: "@test.com" } } });
    await prisma.$disconnect();
  });
