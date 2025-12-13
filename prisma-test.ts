import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("DB CONNECTED!", result);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();