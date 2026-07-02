const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const models = Prisma.dmmf.datamodel.models.map(m => m.name);
  const counts = {};
  
  for (const model of models) {
    // lowercase first letter for prisma client access
    const modelDelegate = model.charAt(0).toLowerCase() + model.slice(1);
    counts[model] = await prisma[modelDelegate].count();
  }
  
  console.log("Current Database Counts:");
  console.table(counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
