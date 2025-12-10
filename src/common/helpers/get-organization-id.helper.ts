/**
 * Helper function to extract organizationId from user object
 * Handles both JWT payload (user.organizationId) and database entity (user.organization?.id)
 */
export function getOrganizationId(user: any): string | null {
  if (!user) {
    return null;
  }
  
  // Priority: user.organizationId (from JWT) > user.organization?.id (from DB relation)
  return user.organizationId ?? user.organization?.id ?? null;
}

