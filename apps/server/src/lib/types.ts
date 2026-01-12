import { UserWithRole } from 'better-auth/plugins/admin'
import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
// import type { Schema } from "hono";
import type { PinoLogger } from "hono-pino";
import { BASE_PATH } from "./constants";



// api-error.ts
export class APIError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message); // Call the parent constructor
    this.name = "APIError";
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}


export interface User {
  id: string;
  email: string;
  name: string;
  facilityId?: number;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: number;
}

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
    user?: User;
    session?: Session;
  };
};

export interface ExtendedUserWithRole extends UserWithRole {
  role: 'accountant' | 'admin' | 'program_manager' | 'superadmin';
  facilityId?: number | null;
  permissions?: Record<string, any> | null; // Changed from string to object
  projectAccess?: number[] | null; // Changed from string to array of project IDs
  configAccess?: Record<string, any> | null; // Changed from string to object
  lastLoginAt?: Date | null;
  isActive?: boolean;
  createdBy?: number | null;
  mustChangePassword?: boolean;
}


// eslint-disable-next-line ts/no-empty-object-type
// export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;
export type AppOpenAPI = OpenAPIHono<AppBindings, {}, typeof BASE_PATH>;

// Use 'any' to avoid strict type mismatch between route definitions and handler implementations during transition.
export type AppRouteHandler<_R = any> = RouteHandler<any, AppBindings>;