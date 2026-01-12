import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth_";

/* eslint-disable no-console */

/**
 * Idempotent admin user seeding
 * Can be run multiple times safely
 * Uses Better Auth API for proper password hashing
 */
export default async function seed(db: Database) {
  console.log("Seeding admin user...");

  try {
    // Get configuration from environment variables
    const adminEmail = process.env.ADMIN_EMAIL ;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const createAdmin = process.env.CREATE_ADMIN !== "false";

    if (!createAdmin) {
      console.log("Admin user creation disabled (CREATE_ADMIN=false)");
      return;
    }

    // Validate configuration
    if (!adminEmail || !adminPassword) {
      console.error("Missing required environment variables: ADMIN_EMAIL or ADMIN_PASSWORD");
      return;
    }

    // Find the facility ID for "ruhengeri referral" hospital in "musanze" district
    const facility = await db
      .select({
        id: schema.facilities.id,
        name: schema.facilities.name,
        districtName: schema.districts.name
      })
      .from(schema.facilities)
      .innerJoin(schema.districts, eq(schema.facilities.districtId, schema.districts.id))
      .where(
        and(
          eq(schema.facilities.name, "ruhengeri referral"),
          eq(schema.districts.name, "musanze")
        )
      )
      .limit(1);

    if (!facility || facility.length === 0) {
      console.error("Facility 'ruhengeri referral' in 'musanze' district not found!");
      console.log("Available facilities in musanze district:");
      const musanzeFacilities = await db
        .select({
          id: schema.facilities.id,
          name: schema.facilities.name
        })
        .from(schema.facilities)
        .innerJoin(schema.districts, eq(schema.facilities.districtId, schema.districts.id))
        .where(eq(schema.districts.name, "musanze"));

      console.log(musanzeFacilities.map(f => `- ${f.name} (ID: ${f.id})`).join('\n'));
      return;
    }

    const facilityId = facility[0].id;
    console.log(`Found facility: ${facility[0].name} in ${facility[0].districtName} district (ID: ${facilityId})`);

    // Check if admin user already exists (idempotency check)
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`Admin user already exists: ${adminEmail}`);
      
      // Check if account exists
      const existingAccount = await db
        .select()
        .from(schema.account)
        .where(
          and(
            eq(schema.account.userId, existingUser[0].id),
            eq(schema.account.providerId, "credential")
          )
        )
        .limit(1);

      if (existingAccount.length > 0) {
        console.log("Admin account already exists. Seeding complete (idempotent).");
        return;
      }

      // User exists but account is missing - this shouldn't happen in normal flow
      // Log warning and skip (user should delete the user record and re-run seed)
      console.warn("⚠️  Admin user exists but account is missing!");
      console.warn("   This is an inconsistent state. To fix:");
      console.warn(`   1. Delete the user: DELETE FROM users WHERE email = '${adminEmail}';`);
      console.warn("   2. Re-run the seed script");
      return;
    }

    // Create new admin user using Better Auth API
    console.log(`Creating new admin user: ${adminEmail}`);
    
    try {
      // Create custom headers for Better Auth hooks
      const customHeaders = new Headers();
      customHeaders.set('x-signup-role', 'admin');
      customHeaders.set('x-signup-facility-id', facilityId.toString());

      // Use Better Auth API to create user with proper password hashing
      const result = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: "admin",
        },
        headers: customHeaders,
      });

      if (!result || !result.user) {
        throw new Error("Failed to create admin user");
      }

      console.log(`Admin user created with ID: ${result.user.id}`);

      // Update additional fields that Better Auth doesn't handle
      await db
        .update(schema.users)
        .set({
          emailVerified: true,
          permissions: null,
          projectAccess: null,
          configAccess: null,
          isActive: true,
          mustChangePassword: false, // Admin doesn't need to change password on first login
        })
        .where(eq(schema.users.id, parseInt(result.user.id)));

      console.log("Admin user seeded successfully!");
      console.log("Login credentials:");
      console.log(`  Email: ${adminEmail}`);
      console.log(`  Password: ${adminPassword}`);
      console.log("  Role: admin");
      console.log(`  Facility: ${facility[0].name} (${facility[0].districtName} district)`);
      console.log("\n⚠️  IMPORTANT: Change the admin password after first login!");

    } catch (error: any) {
      console.error("Failed to create admin user:", error.message);
      throw error;
    }

  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error;
  }
}
