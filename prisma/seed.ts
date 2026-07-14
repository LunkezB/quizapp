import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import * as prismaClient from "../src/generated/prisma/client";

const prismaRuntime =
  (prismaClient as typeof prismaClient & { default?: typeof prismaClient }).default ?? prismaClient;

const { PrismaClient } = prismaRuntime;

const categories = [
  "Общие знания",
  "История",
  "Наука",
  "Кино",
  "Музыка",
  "Спорт",
  "География",
  "IT",
  "Литература",
  "Искусство",
];

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    for (const name of categories) {
      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
