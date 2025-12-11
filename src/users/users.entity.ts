/**
 * Re-export of the official User entity for backward compatibility
 * The official entity is defined in user.entity.ts
 * 
 * This file exists to maintain compatibility with imports that use:
 *   import { User } from './users.entity'
 * 
 * All new code should use:
 *   import { User } from './user.entity'
 */
export * from './user.entity';

