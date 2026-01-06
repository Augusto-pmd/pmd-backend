/**
 * Interface for the user object returned by JWT strategy
 * This represents the user payload attached to the request by Passport
 */
export interface JwtUserPayload {
  id: string;
  email: string;
  fullName: string;
  role: {
    id: string;
    name: string;
    permissions?: string[];
  } | string;
  organizationId: string | null;
  organization: {
    id: string | null;
    name: string | null;
  } | null;
}

