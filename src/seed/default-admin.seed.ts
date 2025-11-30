import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';
import { Cashbox } from '../cashboxes/cashboxes.entity';
import { Expense } from '../expenses/expenses.entity';
import { Work } from '../works/works.entity';
import { WorkBudget } from '../work-budgets/work-budgets.entity';
import { Contract } from '../contracts/contracts.entity';
import { UserRole } from '../common/enums/user-role.enum';

// Load environment variables
config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pmd_management',
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  synchronize: false,
  logging: false,
});

async function seedDefaultAdmin() {
  try {
    console.log('🌱 Starting default admin seed...');

    // Initialize DataSource
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const roleRepository = dataSource.getRepository(Role);
    const userRepository = dataSource.getRepository(User);

    // 1. Seed Roles (idempotent)
    console.log('📋 Checking and seeding roles...');
    
    // Note: Using existing enum values from DB (administration, supervisor, operator)
    // These map to: admin -> administration, supervisor -> supervisor, user -> operator
    const rolesToCreate = [
      {
        name: UserRole.ADMINISTRATION, // Maps to 'admin' concept
        description: 'Administrator role with full system access',
        permissions: {
          users: ['create', 'read', 'update', 'delete'],
          roles: ['create', 'read', 'update', 'delete'],
          works: ['create', 'read', 'update', 'delete'],
          expenses: ['create', 'read', 'update', 'delete', 'validate'],
          suppliers: ['create', 'read', 'update', 'delete'],
          contracts: ['create', 'read', 'update', 'delete'],
          cashboxes: ['create', 'read', 'update', 'delete', 'close'],
          accounting: ['create', 'read', 'update', 'delete'],
          reports: ['read'],
        },
      },
      {
        name: UserRole.SUPERVISOR,
        description: 'Supervisor role with work oversight and schedule management',
        permissions: {
          works: ['read', 'update'],
          expenses: ['read'],
          suppliers: ['read'],
          contracts: ['read'],
          cashboxes: ['read'],
          schedule: ['read', 'update'],
          reports: ['read'],
        },
      },
      {
        name: UserRole.OPERATOR, // Maps to 'user' concept
        description: 'Operator role with limited access to own resources',
        permissions: {
          works: ['read'],
          expenses: ['create', 'read'],
          suppliers: ['create', 'read'],
          cashboxes: ['create', 'read', 'close'],
        },
      },
    ];

    const createdRoles: Record<string, Role> = {};
    
    for (const roleData of rolesToCreate) {
      let role = await roleRepository.findOne({ where: { name: roleData.name } });
      
      if (!role) {
        role = roleRepository.create(roleData);
        role = await roleRepository.save(role);
        console.log(`  ✅ Created role: ${roleData.name}`);
      } else {
        console.log(`  ℹ️  Role already exists: ${roleData.name}`);
      }
      
      createdRoles[roleData.name] = role;
    }

    // 2. Get admin role ID (using ADMINISTRATION as admin)
    const adminRole = createdRoles[UserRole.ADMINISTRATION];
    if (!adminRole) {
      throw new Error('Admin role not found after creation');
    }

    console.log(`  📌 Admin role ID: ${adminRole.id}`);

    // 3. Seed Default Admin User (idempotent)
    console.log('👤 Checking and seeding default admin user...');
    
    const adminEmail = 'root@system.local';
    let adminUser = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      adminUser = userRepository.create({
        fullName: 'Root Admin',
        email: adminEmail,
        password: hashedPassword,
        role: adminRole,
        isActive: true,
      });

      adminUser = await userRepository.save(adminUser);
      console.log(`  ✅ Created admin user: ${adminEmail}`);
    } else {
      console.log(`  ℹ️  Admin user already exists: ${adminEmail}`);
    }

    console.log('');
    console.log('✅ Default admin seed completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`  - Roles created/verified: ${Object.keys(createdRoles).length}`);
    console.log(`  - Admin user: ${adminEmail}`);
    console.log(`  - Admin password: 123456`);
    console.log('');
    console.log('💡 You can now login with:');
    console.log(`  POST http://localhost:3001/auth/login`);
    console.log(`  { "email": "${adminEmail}", "password": "123456" }`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Run seed
seedDefaultAdmin();

