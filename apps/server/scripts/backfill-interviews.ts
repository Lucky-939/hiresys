import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling interviewerId for existing interviews...');

  try {
    const interviews = await prisma.interview.findMany({
      where: {
        interviewerId: null
      }
    });

    for (const interview of interviews) {
      await prisma.interview.update({
        where: { id: interview.id },
        data: {
          interviewerId: interview.createdById
        }
      });
    }

    console.log(`Backfilled ${interviews.length} interviews successfully.`);
  } catch (error) {
    console.error('Error during interview backfill:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
