'use client';

import { createContext, useContext, ReactNode } from 'react';

// Define the session data types based on your console output
interface SessionData {
  session: {
    expiresAt: string;
    token: string;
    createdAt: string;
    updatedAt: string;
    ipAddress: string;
    userAgent: string;
    userId: string;
    impersonatedBy: string | null;
    activeOrganizationId: string | null;
    id: string;
  };
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
    role: string;
    banned: boolean;
    banReason: string | null;
    banExpires: string | null;
    facilityId: number;
    districtId?: number;
    permissions: string[]; // Array of permission strings
    projectAccess: number[]; // Array of project IDs
    configAccess: string; // JSON string of config object (not yet migrated)
    lastLoginAt: string | null;
    isActive: boolean;
    createdBy: string | null;
    mustChangePassword: boolean;
    id: string;
  };
}

interface SessionContextType {
  sessionData: SessionData;
  user: SessionData['user'];
  session: SessionData['session'];
  // Utility methods for common operations
  hasPermission: (permission: string) => boolean;
  getUserPermissions: () => string[];
  getConfigAccess: () => Record<string, any>;
  isSessionValid: () => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
  sessionData: SessionData;
}

export function SessionProvider({ children, sessionData }: SessionProviderProps) {
  // Get user permissions (already an array)
  const getUserPermissions = (): string[] => {
    return sessionData.user.permissions || [];
  };

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    const permissions = getUserPermissions();
    return permissions.includes(permission);
  };

  // Parse config access from JSON string
  const getConfigAccess = (): Record<string, any> => {
    try {
      return JSON.parse(sessionData.user.configAccess);
    } catch {
      return {};
    }
  };

  // Check if session is still valid
  const isSessionValid = (): boolean => {
    const expiresAt = new Date(sessionData.session.expiresAt);
    return expiresAt > new Date();
  };

  const contextValue: SessionContextType = {
    sessionData,
    user: sessionData.user,
    session: sessionData.session,
    hasPermission,
    getUserPermissions,
    getConfigAccess,
    isSessionValid,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

// Custom hook to use session context
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// Additional utility hooks for specific use cases
export function useUser() {
  const { user } = useSession();
  return user;
}

export function usePermissions() {
  const { hasPermission, getUserPermissions } = useSession();
  return { hasPermission, getUserPermissions };
}

export function useSessionStatus() {
  const { isSessionValid, session } = useSession();
  return { isSessionValid, expiresAt: new Date(session.expiresAt) };
}