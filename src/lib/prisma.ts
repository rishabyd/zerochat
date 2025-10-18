import { PrismaClient } from "@prisma/client";

// Global type declaration to prevent multiple Prisma client instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Export singleton Prisma client instance
export const prisma =
  globalForPrisma.prisma ?? // Use existing instance if available
  new PrismaClient({
    log: ["query"], // Log all database queries for debugging
  });

// Store Prisma instance globally in development to prevent multiple instances
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
