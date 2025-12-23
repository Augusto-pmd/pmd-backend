/**
 * Interface for JWT token payload
 * This represents the data encoded in the JWT token
 */
export interface JwtPayload {
  /** Subject - User ID (UUID) */
  sub: string;
  /** User email address */
  email: string;
  /** User role name */
  role: string;
  /** Organization ID (optional, may be included in token) */
  organizationId?: string;
}

