import { Repository } from 'typeorm';
import { Role } from '../../roles/role.entity';
import { UserRole } from '../enums/user-role.enum';

/**
 * Helper function to get or create default role (administration/admin)
 * Returns a role object with id and name
 */
export async function getDefaultRole(roleRepository: Repository<Role>): Promise<{ id: string; name: string }> {
  // Try to find 'administration' role first
  let defaultRole = await roleRepository.findOne({
    where: { name: UserRole.ADMINISTRATION },
  });

  // If not found, try searching all roles for 'admin' or 'administration'
  if (!defaultRole) {
    const roles = await roleRepository.find();
    defaultRole = roles.find(
      (r) => {
        if (!r.name) return false;
        const roleName = r.name.toString().toLowerCase();
        return roleName === 'admin' || roleName === 'administration' || r.name === UserRole.ADMINISTRATION;
      }
    );
  }

  // If still not found, create it
  if (!defaultRole) {
    defaultRole = roleRepository.create({
      name: UserRole.ADMINISTRATION,
      description: 'Default administration role',
    });
    defaultRole = await roleRepository.save(defaultRole);
  }

  return {
    id: defaultRole.id,
    name: defaultRole.name.toString(),
  };
}

