import { PrismaClient } from "@prisma/client";

// Single shared client. Re-using one PrismaClient is important under load —
// each instance opens its own connection pool, and dev reloads can otherwise
// exhaust Postgres connections.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
