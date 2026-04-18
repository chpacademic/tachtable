const { loadEnvFile } = require("../apps/api/runtime/load-env");
const { createSampleDatabase } = require("../apps/api/runtime/sample-data");
const { disconnectPrisma, replacePrismaDatabase } = require("../apps/api/runtime/prisma-driver");

async function main() {
  loadEnvFile();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed Prisma");
  }

  await replacePrismaDatabase(createSampleDatabase());
  await disconnectPrisma();
  console.log("Prisma database seeded with TeachTable sample data");
}

main().catch(async (error) => {
  console.error(error);
  await disconnectPrisma().catch(() => undefined);
  process.exitCode = 1;
});
