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

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);
    
    // Verificar y crear tablas/columnas necesarias
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      // Verificar si la tabla organizations existe, si no, crearla
      const orgTableExists = await queryRunner.hasTable('organizations');
      
      if (!orgTableExists) {
        console.log('📋 Creando tabla organizations...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "organizations" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" varchar(255) NOT NULL,
            "description" text,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
          );
        `);
        console.log('✅ Tabla organizations creada');
      }

      // Verificar y agregar columnas necesarias en users
      const usersTable = await queryRunner.getTable('users');
      if (usersTable) {
        // Agregar organization_id si no existe
        const orgIdColumn = usersTable.findColumnByName('organization_id');
        if (!orgIdColumn) {
          console.log('📋 Agregando columna organization_id a users...');
          await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "organization_id" uuid;
          `);
          
          // Agregar foreign key si no existe
          await queryRunner.query(`
            ALTER TABLE "users"
            ADD CONSTRAINT "FK_users_organization" 
            FOREIGN KEY ("organization_id") 
            REFERENCES "organizations"("id") 
            ON DELETE SET NULL 
            ON UPDATE CASCADE;
          `);
          console.log('✅ Columna organization_id agregada a users');
        }

        // Agregar fullName si no existe (la migración usa "name" pero la entidad usa "fullName")
        const fullNameColumn = usersTable.findColumnByName('fullName');
        const nameColumn = usersTable.findColumnByName('name');
        if (!fullNameColumn && nameColumn) {
          // Renombrar name a fullName para que coincida con la entidad
          console.log('📋 Renombrando columna name a fullName en users...');
          await queryRunner.query(`
            ALTER TABLE "users" 
            RENAME COLUMN "name" TO "fullName";
          `);
          console.log('✅ Columna renombrada a fullName');
        } else if (!fullNameColumn && !nameColumn) {
          // Si no existe ninguna, crear fullName
          console.log('📋 Agregando columna fullName a users...');
          await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "fullName" varchar(255);
          `);
          console.log('✅ Columna fullName agregada a users');
        }

        // Renombrar is_active a isActive si existe
        const isActiveColumn = usersTable.findColumnByName('isActive');
        const isActiveSnakeColumn = usersTable.findColumnByName('is_active');
        if (!isActiveColumn && isActiveSnakeColumn) {
          console.log('📋 Renombrando columna is_active a isActive en users...');
          await queryRunner.query(`
            ALTER TABLE "users" 
            RENAME COLUMN "is_active" TO "isActive";
          `);
          console.log('✅ Columna renombrada a isActive');
        } else if (!isActiveColumn && !isActiveSnakeColumn) {
          // Si no existe ninguna, crear isActive
          console.log('📋 Agregando columna isActive a users...');
          await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "isActive" boolean NOT NULL DEFAULT true;
          `);
          console.log('✅ Columna isActive agregada a users');
        }
      }
    } finally {
      await queryRunner.release();
    }

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
    console.error('💥 Error fatal en seed:', error);
    process.exit(1);
  });

