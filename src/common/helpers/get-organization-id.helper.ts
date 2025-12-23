import { User } from '../../users/user.entity';
import { JwtUserPayload } from '../../auth/interfaces/jwt-user-payload.interface';

/**
 * Type union for user objects that can be passed to getOrganizationId
 * Supports both database User entities and JWT user payloads
 */
type UserWithOrganization = User | JwtUserPayload;

/**
 * Helper function to extract organizationId from user object
 * Handles both JWT payload (user.organizationId) and database entity (user.organization?.id)
 * 
 * Priority: user.organizationId (direct property) > user.organization?.id (from DB relation)
 * 
 * @param user - User entity from database or JWT user payload
 * @returns Organization ID string or null if not found
 */
export function getOrganizationId(user: UserWithOrganization | null | undefined): string | null {
  if (!user) {
    return null;
  }
  
  // Priority: user.organizationId (from JWT or User entity) > user.organization?.id (from DB relation)
  return user.organizationId ?? user.organization?.id ?? null;
}

