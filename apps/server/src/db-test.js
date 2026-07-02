const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'newtester@example.com' },
    include: { organizations: true }
  });
  console.log("USER:", JSON.stringify(user, null, 2));

  if (user) {
    const orgs = await prisma.organizationMember.findMany({
      where: { userId: user.id }
    });
    console.log("ORG MEMBERS:", JSON.stringify(orgs, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
