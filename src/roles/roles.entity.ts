/**
 * Re-export of the official Role entity for backward compatibility
 * The official entity is defined in role.entity.ts
 * 
 * This file exists to maintain compatibility with imports that use:
 *   import { Role } from './roles.entity'
 * 
 * All new code should use:
 *   import { Role } from './role.entity'
 */
export * from './role.entity';

