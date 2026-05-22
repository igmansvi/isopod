/**
 * @file Prisma client singleton for Isopod.
 * @description Prevents multiple PrismaClient instances during
 * Next.js hot-module reloading in development by caching the
 * client on `globalThis`.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  prismaPool: Pool;
};

// Ensure we don't include accidental surrounding quotes from .env files
let rawDatabaseUrl = process.env.DATABASE_URL ?? "";

// If DATABASE_URL is not present in the environment, attempt to read a
// .env file from the repository root as a last resort (helps dev servers).
if (!rawDatabaseUrl) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const contents = fs.readFileSync(envPath, "utf8");
      for (const line of contents.split(/\r?\n/)) {
        const m = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
        if (m) {
          rawDatabaseUrl = m[1].trim();
          // strip surrounding quotes if present
          rawDatabaseUrl = rawDatabaseUrl.replace(/^"([\s\S]*)"$/, "$1");
          break;
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[prisma] failed to read .env for DATABASE_URL:", err);
  }
}

const connectionString = rawDatabaseUrl.replace(/^"([\s\S]*)"$/, "$1");

// Helpful runtime log for debugging database connectivity issues.
// eslint-disable-next-line no-console

const pool = globalForPrisma.prismaPool || new Pool({ connectionString });
const adapter = new PrismaPg(pool);

/**
 * @constant prisma
 * @description Shared PrismaClient instance. Re-uses an existing
 * client stored on `globalThis` when running in development mode
 * to survive HMR cycles without exhausting database connections.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;
}
