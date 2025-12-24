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

    // 2. Crear Rol ADMINISTRATION si no existe
    let adminRole = await roleRepository.findOne({ 
      where: { name: UserRole.ADMINISTRATION } 
    });
    
    if (!adminRole) {
      adminRole = roleRepository.create({
        name: UserRole.ADMINISTRATION,
        description: 'Rol de administración con acceso completo al sistema',
        permissions: {
          all: true,
        },
      });
      adminRole = await roleRepository.save(adminRole);
      console.log('✅ Rol creado: ADMINISTRATION');
    } else {
      console.log('ℹ️  Rol ya existe: ADMINISTRATION');
    }

    // 3. Crear Usuario Admin
    const adminEmail = 'admin@pmd.com';
    const adminPlainPassword = '1102Pequ';
    
    // Buscar usuario sin relaciones primero para evitar errores
    let admin = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (!admin) {
      const hashedPassword = await bcrypt.hash(adminPlainPassword, 10);
      admin = userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        fullName: 'Administrador PMD',
        role: adminRole,
        organization: defaultOrg,
        isActive: true,
      });
      admin = await userRepository.save(admin);
      console.log('✅ Usuario admin creado');
    } else {
      // Actualizar si falta información
      let updated = false;
      
      if (!admin.role) {
        admin.role = adminRole;
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
        console.log('🔧 Usuario admin actualizado');
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

