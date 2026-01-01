import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { User } from './users/user.entity';
import { Role } from './roles/role.entity';
import { Organization } from './organizations/organization.entity';
import { UserRole } from './common/enums/user-role.enum';
import dataSource from './data-source';

// Load environment variables
config();

async function seed() {
  console.log('🌱 Iniciando seed de base de datos...\n');

  // Initialize DataSource
  const AppDataSource = dataSource;
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Conectado a la base de datos\n');

    // Ejecutar migraciones pendientes antes del seed
    console.log('🔄 Ejecutando migraciones pendientes...\n');
    const pendingMigrations = await AppDataSource.runMigrations();
    if (pendingMigrations.length > 0) {
      console.log(`✅ ${pendingMigrations.length} migración(es) ejecutada(s):`);
      pendingMigrations.forEach(migration => {
        console.log(`   - ${migration.name}`);
      });
      console.log('');
    } else {
      console.log('ℹ️  No hay migraciones pendientes\n');
    }

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);
    const orgRepository = AppDataSource.getRepository(Organization);

    // 1. Crear Organización por defecto
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
    let defaultOrg = await orgRepository.findOne({ where: { id: DEFAULT_ORG_ID } });
    
    if (!defaultOrg) {
      defaultOrg = orgRepository.create({
        id: DEFAULT_ORG_ID,
        name: 'PMD Arquitectura',
        description: 'Organización por defecto PMD',
      });
      defaultOrg = await orgRepository.save(defaultOrg);
      console.log('✅ Organización creada: PMD Arquitectura');
    } else {
      console.log('ℹ️  Organización ya existe: PMD Arquitectura');
    }

    // 2. Crear todos los roles
    const rolesToCreate = [
      {
        name: UserRole.DIRECTION,
        description: 'Rol de dirección con acceso completo al sistema y permisos de sobrescritura',
        permissions: { all: true },
      },
      {
        name: UserRole.SUPERVISOR,
        description: 'Rol de supervisión de obras y gestión de cronogramas',
        permissions: {},
      },
      {
        name: UserRole.ADMINISTRATION,
        description: 'Rol de administración con permisos de validación y aprobación',
        permissions: {},
      },
      {
        name: UserRole.OPERATOR,
        description: 'Rol de operador con acceso limitado a recursos propios',
        permissions: {},
      },
    ];

    const createdRoles: { [key: string]: Role } = {};
    
    for (const roleData of rolesToCreate) {
      let role = await roleRepository.findOne({ 
        where: { name: roleData.name } 
      });
      
      if (!role) {
        role = roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
        });
        role = await roleRepository.save(role);
        console.log(`✅ Rol creado: ${roleData.name.toUpperCase()}`);
      } else {
        console.log(`ℹ️  Rol ya existe: ${roleData.name.toUpperCase()}`);
      }
      
      createdRoles[roleData.name] = role;
    }

    // 3. Crear Usuario Admin con rol DIRECTION (mayor rol)
    const adminEmail = 'admin@pmd.com';
    const adminPlainPassword = '1102Pequ';
    const directionRole = createdRoles[UserRole.DIRECTION];
    
    if (!directionRole) {
      throw new Error('El rol DIRECTION no se pudo crear o encontrar');
    }
    
    // Buscar usuario sin relaciones primero para evitar errores
    let admin = await userRepository.findOne({
      where: { email: adminEmail },
      relations: ['role'],
    });

    if (!admin) {
      const hashedPassword = await bcrypt.hash(adminPlainPassword, 10);
      admin = userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        fullName: 'Administrador PMD',
        role: directionRole,
        organization: defaultOrg,
        isActive: true,
      });
      admin = await userRepository.save(admin);
      console.log('✅ Usuario admin creado con rol DIRECTION');
    } else {
      // Actualizar si falta información o si tiene un rol diferente
      let updated = false;
      
      // Actualizar el rol a DIRECTION si no lo tiene
      if (!admin.role || admin.role.name !== UserRole.DIRECTION) {
        admin.role = directionRole;
        updated = true;
      }
      
      if (!admin.organization) {
        admin.organization = defaultOrg;
        updated = true;
      }
      
      if (!admin.isActive) {
        admin.isActive = true;
        updated = true;
      }

      // Verificar si la contraseña está hasheada correctamente
      const isHashCorrect = admin.password && admin.password.length >= 50;
      if (!isHashCorrect) {
        admin.password = await bcrypt.hash(adminPlainPassword, 10);
        updated = true;
      }

      if (updated) {
        await userRepository.save(admin);
        console.log('🔧 Usuario admin actualizado con rol DIRECTION');
      } else {
        console.log('ℹ️  Usuario admin ya existe y está actualizado');
      }
    }

    console.log('\n📋 Credenciales del usuario admin:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPlainPassword}`);
    console.log('\n✅ Seed completado exitosamente!\n');

  } catch (error) {
    // Los errores en seed siempre se muestran ya que es un script de inicialización
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexión a la base de datos cerrada');
    }
  }
}

// Ejecutar seed
seed()
  .then(() => {
    console.log('✨ Proceso de seed finalizado');
    process.exit(0);
  })
  .catch((error) => {
    // Los errores fatales en seed siempre se muestran ya que es un script de inicialización
    console.error('💥 Error fatal en seed:', error);
    process.exit(1);
  });

