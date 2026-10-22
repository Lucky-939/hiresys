import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Get the main Lucky Bhoir user who is owner
  const user = await prisma.user.findUnique({
    where: { email: "luckybhoir2230@gmail.com" }
  });
  if (!user) throw new Error("User not found");

  const token = jwt.sign(
    { sub: user.id },
    process.env.JWT_SECRET || "luckybhoirrandomjwtsecretkeyforinterviewplatform",
    { expiresIn: "24h" }
  );

  console.log("JWT TOKEN FOR BROWSER INJECTION:");
  console.log(token);
  console.log("\nUser ID:", user.id);
  
  await prisma.$disconnect();
}

main().catch(console.error);
