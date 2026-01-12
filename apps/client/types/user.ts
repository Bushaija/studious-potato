// User types based on API structure
export type UserRole = "admin" | "accountant" | "program_manager" | "daf" | "dg" | "superadmin";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: UserRole;
  facilityId: number;
  facilityName?: string | null;
  permissions: string[]; // Array of permission strings
  projectAccess: number[]; // Array of project IDs
  configAccess: string; // JSON string (not yet migrated)
  isActive: boolean;
  mustChangePassword: boolean;
  banned: boolean;
  banReason?: string | null;
  banExpires?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  facility?: {
    id: number;
    name: string;
    facilityType: string;
  };
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  facilityId: number;
  permissions: string[]; // Array of permission strings
  projectAccess: number[]; // Array of project IDs
  mustChangePassword?: boolean;
  isActive?: boolean;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: string | null;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
  facilityId?: number;
  permissions?: string[]; // Array of permission strings
  projectAccess?: number[]; // Array of project IDs
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface BanUserData {
  userId: string;
  banReason: string;
  banExpiresIn?: number;
  banExpiresAt?: string;
}

export interface UnbanUserData {
  userId: string;
  reason: string;
}

export interface UsersResponse {
  users: User[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserResponse {
  user: User;
}
