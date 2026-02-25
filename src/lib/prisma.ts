import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    // Return a dummy proxy so the module can be imported without DATABASE_URL.
    // Any actual Prisma call will throw, but callers should short-circuit
    // (e.g. fetchLeaderboard returns mock data when DATABASE_URL is unset).
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === "then") return undefined; // not a thenable
        return () => {
          throw new Error("DATABASE_URL is not set — cannot use Prisma");
        };
      },
    });
  }
  // Supabase pooler: username must be postgres.[PROJECT_REF], not just "postgres",
  // or you get "Tenant or user not found". Use the connection string from the dashboard.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
