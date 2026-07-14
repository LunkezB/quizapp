// No `server-only` import here, unlike other modules under src/lib: this
// file is also loaded from server.ts's socket handlers via tsx, outside
// Next.js's bundler, and the `server-only` package's client/server split
// relies on bundler-specific export conditions that don't apply under tsx.
import { PrismaPg } from "@prisma/adapter-pg";
import * as prismaClient from "@/generated/prisma/client";

const prismaRuntime =
  (prismaClient as typeof prismaClient & { default?: typeof prismaClient }).default ?? prismaClient;

const { PrismaClient } = prismaRuntime;

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClientInstance;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
