import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../src/users/user.entity';
import { Role } from '../src/roles/role.entity';
import { Organization } from '../src/organizations/organization.entity';
import { UserRole } from '../src/common/enums/user-role.enum';

interface UserSeed {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
}

const DEFAULT_PASSWORD = 'password123';
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

const usersToSeed: UserSeed[] = [
  {
    email: 'admin@pmd.com',
    fullName: 'Administrador PMD',
    role: UserRole.ADMINISTRATION,
    password: process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD,
  },
  {
    email: 'direction@pmd.com',
    fullName: 'Dirección PMD',
    role: UserRole.DIRECTION,
    password: process.env.DIRECTION_PASSWORD || DEFAULT_PASSWORD,
  },
  {
    email: 'supervisor@pmd.com',
    fullName: 'Supervisor PMD',
    role: UserRole.SUPERVISOR,
    password: process.env.SUPERVISOR_PASSWORD || DEFAULT_PASSWORD,
  },
  {
    email: 'operator@pmd.com',
    fullName: 'Operador PMD',
    role: UserRole.OPERATOR,
    password: process.env.OPERATOR_PASSWORD || DEFAULT_PASSWORD,
  },
];

async function bootstrapUsers() {
  try {
    console.log('🚀 Iniciando bootstrap de usuarios...\n');

    // Initialize DataSource
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      console.log('✅ Conexión a la base de datos inicializada\n');
    }

    const roleRepository = dataSource.getRepository(Role);
    const userRepository = dataSource.getRepository(User);
    const orgRepository = dataSource.getRepository(Organization);

    // 1. Crear o obtener organización por defecto
    console.log('📋 Verificando organización por defecto...');
    let defaultOrg = await orgRepository.findOne({ where: { id: DEFAULT_ORG_ID } });
    if (!defaultOrg) {
      defaultOrg = orgRepository.create({
        id: DEFAULT_ORG_ID,
        name: 'PMD Arquitectura',
        description: 'Organización por defecto PMD',
      });
      defaultOrg = await orgRepository.save(defaultOrg);
      console.log('✅ Organización creada:', defaultOrg.name);
    } else {
      console.log('✅ Organización ya existe:', defaultOrg.name);
    }
    console.log('');

    // 2. Crear o obtener roles
    console.log('👥 Verificando roles...');
    const rolesMap = new Map<UserRole, Role>();

    for (const roleName of Object.values(UserRole)) {
      let role = await roleRepository.findOne({ where: { name: roleName } });
      if (!role) {
        role = roleRepository.create({
          name: roleName,
          description: `Rol ${roleName}`,
        });
        role = await roleRepository.save(role);
        console.log(`✅ Rol creado: ${roleName}`);
      } else {
        console.log(`✅ Rol ya existe: ${roleName}`);
      }
      rolesMap.set(roleName, role);
    }
    console.log('');

    // 3. Crear usuarios
    console.log('👤 Creando usuarios...\n');
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const userSeed of usersToSeed) {
      const existingUser = await userRepository.findOne({
        where: { email: userSeed.email },
        relations: ['role', 'organization'],
      });

      if (existingUser) {
        // Verificar si necesita actualización
        let needsUpdate = false;

        if (!existingUser.role || existingUser.role.name !== userSeed.role) {
          existingUser.role = rolesMap.get(userSeed.role)!;
          needsUpdate = true;
        }

        if (!existingUser.organization) {
          existingUser.organization = defaultOrg;
          needsUpdate = true;
        }

        if (!existingUser.isActive) {
          existingUser.isActive = true;
          needsUpdate = true;
        }

        // Verificar si la contraseña necesita actualización (si no es un hash válido)
        const isHashValid = existingUser.password && existingUser.password.length >= 50;
        if (!isHashValid) {
          existingUser.password = await bcrypt.hash(userSeed.password, 10);
          needsUpdate = true;
        }

        if (needsUpdate) {
          await userRepository.save(existingUser);
          console.log(`🔧 Usuario actualizado: ${userSeed.email} (${userSeed.role})`);
          updatedCount++;
        } else {
          console.log(`⏭️  Usuario ya existe: ${userSeed.email} (${userSeed.role})`);
          skippedCount++;
        }
      } else {
        // Crear nuevo usuario
        const hashedPassword = await bcrypt.hash(userSeed.password, 10);
        const newUser = userRepository.create({
          email: userSeed.email,
          fullName: userSeed.fullName,
          password: hashedPassword,
          role: rolesMap.get(userSeed.role)!,
          organization: defaultOrg,
          isActive: true,
        });
        await userRepository.save(newUser);
        console.log(`✅ Usuario creado: ${userSeed.email} (${userSeed.role})`);
        createdCount++;
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Creados: ${createdCount}`);
    console.log(`   🔧 Actualizados: ${updatedCount}`);
    console.log(`   ⏭️  Ya existían: ${skippedCount}`);
    console.log(`   📝 Total procesados: ${usersToSeed.length}\n`);

    console.log('✅ Bootstrap de usuarios completado exitosamente!\n');

    // Mostrar usuarios creados
    console.log('📋 Usuarios disponibles para login:');
    for (const userSeed of usersToSeed) {
      console.log(`   - ${userSeed.email} (${userSeed.role})`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error durante el bootstrap:', error);
    throw error;
  } finally {
    // Cerrar conexión DataSource
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Conexión a la base de datos cerrada');
    }
  }
}

bootstrapUsers()
  .then(() => {
    console.log('\n🎉 Proceso finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
