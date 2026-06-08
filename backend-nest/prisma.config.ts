import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 moved migration/studio connection settings out of
// schema.prisma. Runtime PrismaClient still needs the URL too - that side
// goes through @prisma/adapter-pg in prisma.service.ts.
//
loadEnvFiles();

const PLACEHOLDER_DATABASE_URL =
  "postgresql://placeholder@localhost:5432/placeholder";
const databaseUrl = process.env.DATABASE_URL ?? fallbackDatabaseUrl();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});

function loadEnvFiles() {
  const paths =
    process.env.NODE_ENV === "test"
      ? [
          resolve(process.cwd(), "../.env.test.local"),
          resolve(process.cwd(), "../.env.test"),
          resolve(process.cwd(), ".env.test.local"),
          resolve(process.cwd(), ".env.test"),
          resolve(process.cwd(), "../.env.local"),
          resolve(process.cwd(), ".env.local"),
          resolve(process.cwd(), ".env"),
        ]
      : [
          resolve(process.cwd(), "../.env.local"),
          resolve(process.cwd(), ".env.local"),
          resolve(process.cwd(), ".env"),
        ];

  for (const path of paths) {
    if (existsSync(path)) dotenv.config({ path, override: false });
  }
}

function fallbackDatabaseUrl() {
  if (process.argv.some((arg) => arg.includes("generate"))) {
    return PLACEHOLDER_DATABASE_URL;
  }

  throw new Error(
    "DATABASE_URL is required for Prisma commands. Run setup.sh first, or add DATABASE_URL to .env.local at the workspace root.",
  );
}
