/**
 * Script to check verification tokens in the database
 * Usage: npx tsx src/scripts/check-verification-tokens.ts [email]
 */

import { db } from "@/db";
import { verification } from "@/db/schema";
import { eq } from "drizzle-orm";

async function checkTokens(email?: string) {
  try {
    console.log("=== Verification Tokens Check ===\n");

    if (email) {
      // Check tokens for specific email
      const tokens = await db.query.verification.findMany({
        where: eq(verification.identifier, email),
      });

      console.log(`Tokens for ${email}:`);
      if (tokens.length === 0) {
        console.log("  No tokens found");
      } else {
        tokens.forEach((token, index) => {
          const isExpired = token.expiresAt <= new Date();
          console.log(`\n  Token ${index + 1}:`);
          console.log(`    ID: ${token.id}`);
          console.log(`    Identifier: ${token.identifier}`);
          console.log(`    Value: ${token.value}`);
          console.log(`    Expires At: ${token.expiresAt}`);
          console.log(`    Created At: ${token.createdAt}`);
          console.log(`    Status: ${isExpired ? "EXPIRED" : "VALID"}`);
        });
      }
    } else {
      // Check all tokens
      const allTokens = await db.select().from(verification);

      console.log(`Total tokens in database: ${allTokens.length}\n`);

      if (allTokens.length > 0) {
        const now = new Date();
        const validTokens = allTokens.filter(t => t.expiresAt > now);
        const expiredTokens = allTokens.filter(t => t.expiresAt <= now);

        console.log(`Valid tokens: ${validTokens.length}`);
        console.log(`Expired tokens: ${expiredTokens.length}\n`);

        console.log("All tokens:");
        allTokens.forEach((token, index) => {
          const isExpired = token.expiresAt <= now;
          console.log(`\n  Token ${index + 1}:`);
          console.log(`    Email: ${token.identifier}`);
          console.log(`    Value: ${token.value.substring(0, 20)}...`);
          console.log(`    Expires At: ${token.expiresAt}`);
          console.log(`    Status: ${isExpired ? "EXPIRED" : "VALID"}`);
        });
      }
    }

    console.log("\n=== End of Check ===");
  } catch (error) {
    console.error("Error checking tokens:", error);
  } finally {
    process.exit(0);
  }
}

// Get email from command line args
const email = process.argv[2];
checkTokens(email);
