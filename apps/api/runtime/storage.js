const fs = require("node:fs/promises");
const path = require("node:path");
const { createSampleDatabase } = require("./sample-data");
const { ensurePrismaDatabase, readPrismaDatabase, replacePrismaDatabase } = require("./prisma-driver");

const ROOT_DIR = path.resolve(__dirname, "..", "..", "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const OUTPUT_DIR = path.join(ROOT_DIR, "output");
const PDF_OUTPUT_DIR = path.join(OUTPUT_DIR, "pdf");
const CSV_OUTPUT_DIR = path.join(OUTPUT_DIR, "csv");
const TMP_DIR = path.join(ROOT_DIR, "tmp");
const TMP_PDF_DIR = path.join(TMP_DIR, "pdfs");
const DB_FILE = path.join(DATA_DIR, "teachtable-db.json");
const STORAGE_DRIVER = (process.env.TEACHTABLE_STORAGE_DRIVER || (process.env.DATABASE_URL ? "prisma" : "json")).toLowerCase();

let queue = Promise.resolve();

async function ensureRuntimeDirs() {
  await Promise.all([
    fs.mkdir(DATA_DIR, { recursive: true }),
    fs.mkdir(PDF_OUTPUT_DIR, { recursive: true }),
    fs.mkdir(CSV_OUTPUT_DIR, { recursive: true }),
    fs.mkdir(TMP_PDF_DIR, { recursive: true }),
  ]);
}

async function ensureDatabase() {
  await ensureRuntimeDirs();
  if (STORAGE_DRIVER === "prisma") {
    await ensurePrismaDatabase();
    return;
  }

  try {
    await fs.access(DB_FILE);
  } catch {
    const sample = createSampleDatabase();
    await writeDatabase(sample);
  }
}

async function readDatabase() {
  await ensureDatabase();
  if (STORAGE_DRIVER === "prisma") {
    return readPrismaDatabase();
  }
  const raw = await fs.readFile(DB_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeDatabase(database) {
  await ensureRuntimeDirs();
  if (STORAGE_DRIVER === "prisma") {
    await replacePrismaDatabase(database);
    return;
  }
  const tempFile = `${DB_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
  await fs.rename(tempFile, DB_FILE);
}

async function withDatabase(mutator) {
  const operation = queue.then(async () => {
    const database = await readDatabase();
    const result = await mutator(database);
    await writeDatabase(database);
    return result;
  });

  queue = operation.catch(() => undefined);
  return operation;
}

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  OUTPUT_DIR,
  PDF_OUTPUT_DIR,
  CSV_OUTPUT_DIR,
  TMP_PDF_DIR,
  DB_FILE,
  ensureRuntimeDirs,
  ensureDatabase,
  readDatabase,
  writeDatabase,
  withDatabase,
  STORAGE_DRIVER,
};
