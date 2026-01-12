import { authClient } from "@/lib/auth";

// Type for signup request
export type SignUpRequest = {
  name: string;
  email: string;
  password?: string;
  role?: string;
  facilityId?: number;
  permissions?: string[];
  projectAccess?: number[];
  isActive?: boolean;
  mustChangePassword?: boolean;
  banned?: boolean;
  banReason?: string;
  banExpires?: string;
};

// Type for signup response
export type SignUpResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    facilityId?: number;
    permissions?: string[];
    projectAccess?: number[];
    isActive?: boolean;
  };
  session?: any;
};

async function signUp(payload: SignUpRequest) {
  // Generate a secure temporary password (min 8 chars for Better Auth validation)
  const tempPassword = payload.password || crypto.randomUUID().substring(0, 16);
  
  // Use Better Auth's admin createUser API to avoid creating a session for the new user
  const response = await authClient.admin.createUser({
    name: payload.name,
    email: payload.email,
    password: tempPassword,
    // Pass additional fields via fetch options
    fetchOptions: {
      headers: {
        'x-signup-role': payload.role || 'accountant',
        'x-signup-facility-id': payload.facilityId?.toString() || '',
        'x-signup-permissions': JSON.stringify(payload.permissions || []),
        'x-signup-project-access': JSON.stringify(payload.projectAccess || []),
        'x-signup-is-active': payload.isActive?.toString() || 'true',
      },
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to create user');
  }

  // Return the user data
  return {
    user: {
      id: response.data?.user?.id || '',
      name: response.data?.user?.name || '',
      email: response.data?.user?.email || '',
      role: payload.role || 'accountant',
      facilityId: payload.facilityId,
      permissions: payload.permissions,
      projectAccess: payload.projectAccess,
      isActive: payload.isActive,
    },
  };
}

export default signUp;
