import { PrismaClient } from "@prisma/client";
import { isDemoMode } from "./demo-mode";
import { createDemoDb } from "./demo-db";

export { isDemoMode };

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.prisma ??
  (isDemoMode
    ? createDemoDb()
    : new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
