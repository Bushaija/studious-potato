/**
 * Script to cleanup verification tokens
 * Usage: npx tsx src/scripts/cleanup-verification-tokens.ts [email|all|expired]
 */

import { db } from "@/db";
import { verification } from "@/db/schema";
import { eq, lte } from "drizzle-orm";

async function cleanupTokens(mode: string) {
  try {
    console.log("=== Verification Tokens Cleanup ===\n");

    if (mode === "all") {
      // Delete all tokens
      const deleted = await db.delete(verification).returning();
      console.log(`Deleted ${deleted.length} token(s)`);
    } else if (mode === "expired") {
      // Delete only expired tokens
      const deleted = await db.delete(verification)
        .where(lte(verification.expiresAt, new Date()))
        .returning();
      console.log(`Deleted ${deleted.length} expired token(s)`);
    } else {
      // Delete tokens for specific email
      const deleted = await db.delete(verification)
        .where(eq(verification.identifier, mode))
        .returning();
      console.log(`Deleted ${deleted.length} token(s) for ${mode}`);
    }

    console.log("\n=== Cleanup Complete ===");
  } catch (error) {
    console.error("Error cleaning up tokens:", error);
  } finally {
    process.exit(0);
  }
}

// Get mode from command line args
const mode = process.argv[2] || "expired";

if (!["all", "expired"].includes(mode) && !mode.includes("@")) {
  console.error("Usage: npx tsx src/scripts/cleanup-verification-tokens.ts [email|all|expired]");
  process.exit(1);
}

cleanupTokens(mode);
