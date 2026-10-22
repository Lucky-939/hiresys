import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, emailVerified: true },
    take: 10
  });
  console.log("Users in DB:");
  console.log(JSON.stringify(users, null, 2));

  // Also ensure lucky@vppcoe.ac.in is verified so the browser can log in
  const lucky = users.find(u => u.email === "lucky@vppcoe.ac.in");
  if (lucky && !lucky.emailVerified) {
    await prisma.user.update({
      where: { id: lucky.id },
      data: { emailVerified: new Date() }
    });
    console.log(`\nMarked ${lucky.email} as email-verified.`);
  } else if (lucky) {
    console.log(`\n${lucky.email} is already verified.`);
  } else {
    console.log("\nlucky@vppcoe.ac.in not found — checking all verified users...");
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
