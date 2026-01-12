import { betterFetch } from "@better-fetch/fetch";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9999";

// Define the session response type based on Better Auth's structure
export interface SessionData {
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    impersonatedBy?: string | null;
  };
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null;
    role?: string | null;
    facilityId?: number | null;
    permissions?: string | null;
    projectAccess?: string | null;
    configAccess?: string | null;
    lastLoginAt?: Date | null;
    isActive?: boolean | null;
    createdBy?: number | null;
    mustChangePassword?: boolean | null;
  };
}

/**
 * Server-side session fetcher for use in Server Components and Middleware
 * 
 * This function fetches the session from the Better Auth backend server.
 * It should only be used in server-side contexts (Server Components, API routes, middleware).
 * 
 * For client-side usage, use the authClient from './auth.ts' instead.
 */
export async function getSession(headers?: Headers): Promise<{ data: SessionData | null }> {
  try {
    // Extract only the cookie header to avoid connection header issues
    const cookieHeader = headers?.get('cookie');
    
    const response = await betterFetch<SessionData>(`${BACKEND_URL}/auth/get-session`, {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      credentials: "include",
    });

    return {
      data: response.data || null,
    };
  } catch (error) {
    console.error("Error fetching session:", error);
    return {
      data: null,
    };
  }
}
