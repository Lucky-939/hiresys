import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating OrgRoles in the database...');

  try {
    // 1. Add RECRUITER to OrgRole enum if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "OrgRole" ADD VALUE 'RECRUITER';`);
      console.log("Added RECRUITER to OrgRole enum.");
    } catch (e: any) {
      if (!e.message.includes("already exists")) {
        throw e;
      }
      console.log("RECRUITER already exists in OrgRole enum.");
    }

    // 2. Add INTERVIEWER to OrgRole enum if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "OrgRole" ADD VALUE 'INTERVIEWER';`);
      console.log("Added INTERVIEWER to OrgRole enum.");
    } catch (e: any) {
      if (!e.message.includes("already exists")) {
        throw e;
      }
      console.log("INTERVIEWER already exists in OrgRole enum.");
    }

    // 3. Update OrganizationMember
    const memberUpdate = await prisma.$executeRawUnsafe(`
      UPDATE "OrganizationMember" 
      SET "role" = 'RECRUITER' 
      WHERE "role" = 'MEMBER';
    `);
    console.log(`Updated OrganizationMember records.`);

    // 4. Update OrgInvite
    const inviteUpdate = await prisma.$executeRawUnsafe(`
      UPDATE "OrgInvite" 
      SET "role" = 'RECRUITER' 
      WHERE "role" = 'MEMBER';
    `);
    console.log(`Updated OrgInvite records.`);

    console.log("Role migration complete.");

  } catch (error) {
    console.error('Error during role migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
