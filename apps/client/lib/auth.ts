'use client'
import {
  adminClient,
  inferAdditionalFields 
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import z from "zod";

export const authClient = createAuthClient({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth`,
  plugins: [
    adminClient(),
    inferAdditionalFields({
      user: {
      role: {
        type: "string",
        defaultValue: "accountant",
        required: true,
      },
      facilityId: {
        type: "number",
        required: false,
      },
      permissions: {
        type: "string",
        required: false,
      },
      projectAccess: {
        type: 'string',
        required: false,
      },
      configAccess: {
        type: "string",
        required: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        required: false,
      },
      createdBy: {
        type: "number",
        required: false,
      },
      mustChangePassword: {
        type: "boolean",
        defaultValue: true,
        required: false,
      },
      }
  })
  ],
  fetchOptions: {
    credentials: "include",
  },
});