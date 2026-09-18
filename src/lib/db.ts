import { PrismaClient } from "@prisma/client";
import { createDemoDb } from "./demo-db";

export const isDemoMode = !process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { prisma?: any };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: PrismaClient & Record<string, any> =
  globalForPrisma.prisma ??
  (isDemoMode
    ? createDemoDb()
    : new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
