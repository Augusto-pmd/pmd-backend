/**
 * Interface for normalized user object returned by normalizeUser helper
 * This ensures type safety across all endpoints that return user data
 */
export interface NormalizedUser {
  id: string | number;
  email: string;
  fullName: string;
  isActive: boolean;
  role: {
    id: string | number;
    name: string;
    description?: string;
    permissions: string[];
  } | null;
  roleId: string | number | null;
  organizationId: string | number | null;
  organization: {
    id: string | number;
    name: string;
  } | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

