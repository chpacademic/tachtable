const fs = require("node:fs/promises");
const path = require("node:path");
const { loadEnvFile } = require("../apps/api/runtime/load-env");
const { createSampleDatabase } = require("../apps/api/runtime/sample-data");
const { disconnectPrisma, replacePrismaDatabase } = require("../apps/api/runtime/prisma-driver");

async function main() {
  loadEnvFile();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to import into Prisma");
  }

  const filePath = path.resolve(process.cwd(), "data", "teachtable-db.json");
  let database;

  try {
    const raw = await fs.readFile(filePath, "utf8");
    database = JSON.parse(raw);
    console.log(`Imported local JSON database from ${filePath}`);
  } catch {
    database = createSampleDatabase();
    console.log("Local JSON database was not found, seeding sample data instead");
  }

  await replacePrismaDatabase(database);
  await disconnectPrisma();
  console.log("Prisma database import completed");
}

main().catch(async (error) => {
  console.error(error);
  await disconnectPrisma().catch(() => undefined);
  process.exitCode = 1;
});
