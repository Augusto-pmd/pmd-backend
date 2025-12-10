import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { Role } from './roles/role.entity';
import { User } from './users/user.entity';
import { Organization } from './organizations/organization.entity';
import { Rubric } from './rubrics/rubrics.entity';
import { Supplier } from './suppliers/suppliers.entity';
import { SupplierDocument } from './supplier-documents/supplier-documents.entity';
import { Work } from './works/works.entity';
import { WorkBudget } from './work-budgets/work-budgets.entity';
import { Contract } from './contracts/contracts.entity';
import { Cashbox } from './cashboxes/cashboxes.entity';
import { CashMovement } from './cash-movements/cash-movements.entity';
import { Expense } from './expenses/expenses.entity';
import { Income } from './incomes/incomes.entity';
import { UserRole, Currency, SupplierStatus, SupplierDocumentType, WorkStatus, BudgetType, CashboxStatus, CashMovementType, DocumentType, ExpenseState, IncomeType, MonthStatus, AccountingType } from './common/enums';

// Load environment variables
config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pmd_management',
  entities: [
    Role,
    User,
    Organization,
    Rubric,
    Supplier,
    SupplierDocument,
    Work,
    WorkBudget,
    Contract,
    Cashbox,
    CashMovement,
    Expense,
    Income,
  ],
  synchronize: false,
  logging: false,
});

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Initialize DataSource
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const roleRepository = dataSource.getRepository(Role);
    const userRepository = dataSource.getRepository(User);
    const organizationRepository = dataSource.getRepository(Organization);
    const rubricRepository = dataSource.getRepository(Rubric);
    const supplierRepository = dataSource.getRepository(Supplier);
    const supplierDocumentRepository = dataSource.getRepository(SupplierDocument);
    const workRepository = dataSource.getRepository(Work);
    const workBudgetRepository = dataSource.getRepository(WorkBudget);
    const contractRepository = dataSource.getRepository(Contract);
    const cashboxRepository = dataSource.getRepository(Cashbox);
    const cashMovementRepository = dataSource.getRepository(CashMovement);
    const expenseRepository = dataSource.getRepository(Expense);
    const incomeRepository = dataSource.getRepository(Income);

    // 1. Seed Roles (idempotent)
    console.log('📋 Seeding roles...');
    const roles = [
      {
        name: UserRole.DIRECTION,
        description: 'Direction role with full system access and override permissions',
        permissions: {
          users: ['create', 'read', 'update', 'delete'],
          roles: ['create', 'read', 'update', 'delete'],
          works: ['create', 'read', 'update', 'delete'],
          expenses: ['create', 'read', 'update', 'delete', 'validate'],
          suppliers: ['create', 'read', 'update', 'delete', 'approve', 'reject'],
          contracts: ['create', 'read', 'update', 'delete', 'override'],
          cashboxes: ['create', 'read', 'update', 'delete', 'close', 'approve'],
          accounting: ['create', 'read', 'update', 'delete', 'close', 'reopen'],
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
        name: UserRole.ADMINISTRATION,
        description: 'Administration role with validation and approval permissions',
        permissions: {
          works: ['read'],
          expenses: ['read', 'validate'],
          suppliers: ['read', 'approve', 'reject'],
          contracts: ['create', 'read', 'update'],
          cashboxes: ['read', 'approve'],
          accounting: ['create', 'read', 'update', 'close'],
          reports: ['read'],
        },
      },
      {
        name: UserRole.OPERATOR,
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
    for (const roleData of roles) {
      let role = await roleRepository.findOne({ where: { name: roleData.name } });
      if (!role) {
        role = roleRepository.create(roleData);
        role = await roleRepository.save(role);
        console.log(`  ✅ Created role: ${roleData.name}`);
      } else {
        // Update permissions if they exist
        role.permissions = roleData.permissions;
        role = await roleRepository.save(role);
        console.log(`  ℹ️  Role already exists: ${roleData.name}`);
      }
      createdRoles[roleData.name] = role;
    }

    // 1.5. Seed Default Organization (idempotent)
    console.log('🏢 Seeding default organization...');
    // Use a fixed UUID for the default PMD organization
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
    let defaultOrg = await organizationRepository.findOne({ where: { id: DEFAULT_ORG_ID } });
    if (!defaultOrg) {
      defaultOrg = organizationRepository.create({
        id: DEFAULT_ORG_ID,
        name: 'PMD Arquitectura',
        description: 'Organización por defecto PMD',
      });
      defaultOrg = await organizationRepository.save(defaultOrg);
      console.log(`  ✅ Created organization: ${defaultOrg.name} (${defaultOrg.id})`);
    } else {
      // Update name if it exists but is different
      if (defaultOrg.name !== 'PMD Arquitectura') {
        defaultOrg.name = 'PMD Arquitectura';
        defaultOrg = await organizationRepository.save(defaultOrg);
      }
      console.log(`  ℹ️  Organization already exists: ${defaultOrg.name} (${defaultOrg.id})`);
    }

    // 2. Seed Users (idempotent)
    console.log('👥 Seeding users...');
    const defaultPassword = await bcrypt.hash('password123', 10);
    const users = [
      {
        name: 'Direction User',
        email: 'direction@pmd.com',
        password: defaultPassword,
        role: createdRoles[UserRole.DIRECTION],
        phone: '+54 11 1234-5678',
      },
      {
        name: 'Supervisor User',
        email: 'supervisor@pmd.com',
        password: defaultPassword,
        role: createdRoles[UserRole.SUPERVISOR],
        phone: '+54 11 1234-5679',
      },
      {
        name: 'Administration User',
        email: 'admin@pmd.com',
        password: defaultPassword,
        role: createdRoles[UserRole.ADMINISTRATION],
        phone: '+54 11 1234-5680',
      },
      {
        name: 'Operator User 1',
        email: 'operator1@pmd.com',
        password: defaultPassword,
        role: createdRoles[UserRole.OPERATOR],
        phone: '+54 11 1234-5681',
      },
      {
        name: 'Operator User 2',
        email: 'operator2@pmd.com',
        password: defaultPassword,
        role: createdRoles[UserRole.OPERATOR],
        phone: '+54 11 1234-5682',
      },
    ];

    const createdUsers: Record<string, User> = {};
    for (const userData of users) {
      let user = await userRepository.findOne({ 
        where: { email: userData.email },
        relations: ['organization'],
      });
      if (!user) {
        user = userRepository.create({
          fullName: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          organization: defaultOrg,
          isActive: true,
        });
        user = await userRepository.save(user);
        console.log(`  ✅ Created user: ${userData.email} with organization ${defaultOrg.name}`);
      } else {
        // Ensure existing users have organizationId set
        if (!user.organization || !user.organization.id) {
          user.organization = defaultOrg;
          user = await userRepository.save(user);
          console.log(`  ✅ Updated user: ${userData.email} - assigned to organization ${defaultOrg.name}`);
        } else {
          console.log(`  ℹ️  User already exists: ${userData.email}`);
        }
      }
      createdUsers[userData.email] = user;
    }

    // 3. Seed Rubrics (idempotent)
    console.log('📊 Seeding rubrics...');
    const rubrics = [
      { name: 'Materials', code: 'MAT', description: 'Construction materials' },
      { name: 'Labor', code: 'LAB', description: 'Labor costs' },
      { name: 'Services', code: 'SRV', description: 'External services' },
      { name: 'Equipment', code: 'EQP', description: 'Equipment rental' },
      { name: 'Transport', code: 'TRN', description: 'Transportation costs' },
    ];

    const createdRubrics: Record<string, Rubric> = {};
    for (const rubricData of rubrics) {
      let rubric = await rubricRepository.findOne({ where: { code: rubricData.code } });
      if (!rubric) {
        rubric = rubricRepository.create({
          ...rubricData,
          is_active: true,
        });
        rubric = await rubricRepository.save(rubric);
        console.log(`  ✅ Created rubric: ${rubricData.code}`);
      } else {
        console.log(`  ℹ️  Rubric already exists: ${rubricData.code}`);
      }
      createdRubrics[rubricData.code] = rubric;
    }

    // 4. Seed Suppliers (idempotent)
    console.log('🏢 Seeding suppliers...');
    const suppliers = [
      {
        name: 'Construcciones ABC S.A.',
        cuit: '30-12345678-9',
        email: 'contacto@construccionesabc.com',
        phone: '+54 11 4000-0001',
        address: 'Av. Corrientes 1234, CABA',
        status: SupplierStatus.APPROVED,
        created_by_id: createdUsers['admin@pmd.com'].id,
      },
      {
        name: 'Materiales XYZ S.R.L.',
        cuit: '30-87654321-0',
        email: 'ventas@materialesxyz.com',
        phone: '+54 11 4000-0002',
        address: 'Av. Santa Fe 5678, CABA',
        status: SupplierStatus.APPROVED,
        created_by_id: createdUsers['admin@pmd.com'].id,
      },
      {
        name: 'Servicios Técnicos DEF',
        cuit: '20-11223344-5',
        email: 'info@serviciostecnicosdef.com',
        phone: '+54 11 4000-0003',
        address: 'Av. Libertador 9012, CABA',
        status: SupplierStatus.PROVISIONAL,
        created_by_id: createdUsers['operator1@pmd.com'].id,
      },
    ];

    const createdSuppliers: Record<string, Supplier> = {};
    for (const supplierData of suppliers) {
      let supplier = await supplierRepository.findOne({
        where: { cuit: supplierData.cuit },
      });
      if (!supplier) {
        supplier = supplierRepository.create(supplierData);
        supplier = await supplierRepository.save(supplier);
        console.log(`  ✅ Created supplier: ${supplierData.name}`);
      } else {
        console.log(`  ℹ️  Supplier already exists: ${supplierData.name}`);
      }
      createdSuppliers[supplierData.name] = supplier;
    }

    // 5. Seed Supplier Documents (idempotent)
    console.log('📄 Seeding supplier documents...');
    const documents = [
      {
        supplier_id: createdSuppliers['Construcciones ABC S.A.'].id,
        document_type: SupplierDocumentType.ART,
        document_number: 'ART-12345',
        expiration_date: new Date('2025-12-31'),
        is_valid: true,
      },
      {
        supplier_id: createdSuppliers['Construcciones ABC S.A.'].id,
        document_type: SupplierDocumentType.AFIP,
        document_number: 'AFIP-ABC-001',
        expiration_date: new Date('2025-12-31'),
        is_valid: true,
      },
      {
        supplier_id: createdSuppliers['Materiales XYZ S.R.L.'].id,
        document_type: SupplierDocumentType.ART,
        document_number: 'ART-67890',
        expiration_date: new Date('2025-12-31'),
        is_valid: true,
      },
      {
        supplier_id: createdSuppliers['Servicios Técnicos DEF'].id,
        document_type: SupplierDocumentType.ART,
        document_number: 'ART-11111',
        expiration_date: new Date('2024-06-30'), // Expiring soon for testing
        is_valid: true,
      },
    ];

    for (const docData of documents) {
      const existingDoc = await supplierDocumentRepository.findOne({
        where: {
          supplier_id: docData.supplier_id,
          document_type: docData.document_type,
        },
      });
      if (!existingDoc) {
        const doc = supplierDocumentRepository.create(docData);
        await supplierDocumentRepository.save(doc);
        console.log(`  ✅ Created document: ${docData.document_type} for supplier`);
      } else {
        console.log(`  ℹ️  Document already exists`);
      }
    }

    // 6. Seed Works (idempotent)
    console.log('🏗️  Seeding works...');
    const works = [
      {
        name: 'Obra Residencial Palermo',
        client: 'Inversiones Inmobiliarias S.A.',
        address: 'Av. Santa Fe 2000, Palermo, CABA',
        start_date: new Date('2024-01-15'),
        status: WorkStatus.ACTIVE,
        currency: Currency.ARS,
        total_budget: 50000000,
        supervisor_id: createdUsers['supervisor@pmd.com'].id,
      },
      {
        name: 'Edificio Corporativo Microcentro',
        client: 'Desarrollos Urbanos S.A.',
        address: 'Av. Corrientes 1500, Microcentro, CABA',
        start_date: new Date('2024-02-01'),
        status: WorkStatus.ACTIVE,
        currency: Currency.USD,
        total_budget: 2000000,
        supervisor_id: createdUsers['supervisor@pmd.com'].id,
      },
      {
        name: 'Remodelación Comercial Recoleta',
        client: 'Retail Solutions S.A.',
        address: 'Av. Quintana 3000, Recoleta, CABA',
        start_date: new Date('2023-11-01'),
        status: WorkStatus.PAUSED,
        currency: Currency.ARS,
        total_budget: 15000000,
        supervisor_id: createdUsers['supervisor@pmd.com'].id,
      },
    ];

    const createdWorks: Record<string, Work> = {};
    for (const workData of works) {
      let work = await workRepository.findOne({ where: { name: workData.name } });
      if (!work) {
        work = workRepository.create({
          ...workData,
          total_expenses: 0,
          total_incomes: 0,
          physical_progress: 0,
          economic_progress: 0,
          financial_progress: 0,
        });
        work = await workRepository.save(work);
        console.log(`  ✅ Created work: ${workData.name}`);
      } else {
        console.log(`  ℹ️  Work already exists: ${workData.name}`);
      }
      createdWorks[workData.name] = work;
    }

    // 7. Seed Work Budgets (idempotent)
    console.log('💰 Seeding work budgets...');
    const budgets = [
      {
        work_id: createdWorks['Obra Residencial Palermo'].id,
        type: BudgetType.INITIAL,
        amount: 50000000,
        currency: Currency.ARS,
        description: 'Presupuesto inicial',
      },
      {
        work_id: createdWorks['Edificio Corporativo Microcentro'].id,
        type: BudgetType.INITIAL,
        amount: 2000000,
        currency: Currency.USD,
        description: 'Presupuesto inicial',
      },
      {
        work_id: createdWorks['Obra Residencial Palermo'].id,
        type: BudgetType.ADDENDA,
        amount: 5000000,
        currency: Currency.ARS,
        description: 'Addenda 1 - Ampliación',
      },
    ];

    for (const budgetData of budgets) {
      const existingBudget = await workBudgetRepository.findOne({
        where: {
          work_id: budgetData.work_id,
          type: budgetData.type,
          amount: budgetData.amount,
        },
      });
      if (!existingBudget) {
        const budget = workBudgetRepository.create(budgetData);
        await workBudgetRepository.save(budget);
        console.log(`  ✅ Created budget for work`);
      } else {
        console.log(`  ℹ️  Budget already exists`);
      }
    }

    // 8. Seed Contracts (idempotent)
    console.log('📝 Seeding contracts...');
    const contracts = [
      {
        work_id: createdWorks['Obra Residencial Palermo'].id,
        supplier_id: createdSuppliers['Construcciones ABC S.A.'].id,
        rubric_id: createdRubrics['LAB'].id,
        amount_total: 20000000,
        amount_executed: 5000000,
        currency: Currency.ARS,
        payment_terms: '30 días',
        is_blocked: false,
      },
      {
        work_id: createdWorks['Obra Residencial Palermo'].id,
        supplier_id: createdSuppliers['Materiales XYZ S.R.L.'].id,
        rubric_id: createdRubrics['MAT'].id,
        amount_total: 15000000,
        amount_executed: 15000000, // Fully executed - should be blocked
        currency: Currency.ARS,
        payment_terms: '15 días',
        is_blocked: true,
      },
      {
        work_id: createdWorks['Edificio Corporativo Microcentro'].id,
        supplier_id: createdSuppliers['Construcciones ABC S.A.'].id,
        rubric_id: createdRubrics['SRV'].id,
        amount_total: 500000,
        amount_executed: 0,
        currency: Currency.USD,
        payment_terms: '45 días',
        is_blocked: false,
      },
    ];

    for (const contractData of contracts) {
      const existingContract = await contractRepository.findOne({
        where: {
          work_id: contractData.work_id,
          supplier_id: contractData.supplier_id,
          rubric_id: contractData.rubric_id,
        },
      });
      if (!existingContract) {
        const contract = contractRepository.create(contractData);
        await contractRepository.save(contract);
        console.log(`  ✅ Created contract`);
      } else {
        console.log(`  ℹ️  Contract already exists`);
      }
    }

    // 9. Seed Cashboxes (idempotent)
    console.log('💵 Seeding cashboxes...');
    const cashboxes = [
      {
        user_id: createdUsers['operator1@pmd.com'].id,
        status: CashboxStatus.OPEN,
        opening_balance_ars: 50000,
        opening_balance_usd: 500,
        opening_date: new Date('2024-01-15'),
      },
      {
        user_id: createdUsers['operator2@pmd.com'].id,
        status: CashboxStatus.CLOSED,
        opening_balance_ars: 30000,
        opening_balance_usd: 300,
        closing_balance_ars: 25000,
        closing_balance_usd: 250,
        difference_ars: -5000,
        difference_usd: -50,
        difference_approved: true,
        opening_date: new Date('2024-01-10'),
        closing_date: new Date('2024-01-20'),
        difference_approved_by_id: createdUsers['admin@pmd.com'].id,
        difference_approved_at: new Date('2024-01-21'),
      },
    ];

    for (const cashboxData of cashboxes) {
      const existingCashbox = await cashboxRepository.findOne({
        where: {
          user_id: cashboxData.user_id,
          opening_date: cashboxData.opening_date,
        },
      });
      if (!existingCashbox) {
        const cashbox = cashboxRepository.create({
          ...cashboxData,
          closing_balance_ars: cashboxData.closing_balance_ars || 0,
          closing_balance_usd: cashboxData.closing_balance_usd || 0,
          difference_ars: cashboxData.difference_ars || 0,
          difference_usd: cashboxData.difference_usd || 0,
        });
        await cashboxRepository.save(cashbox);
        console.log(`  ✅ Created cashbox for user`);
      } else {
        console.log(`  ℹ️  Cashbox already exists`);
      }
    }

    // 10. Seed Cash Movements (idempotent)
    console.log('💸 Seeding cash movements...');
    const openCashbox = await cashboxRepository.findOne({
      where: { status: CashboxStatus.OPEN },
    });

    if (openCashbox) {
      const movements = [
        {
          cashbox_id: openCashbox.id,
          type: CashMovementType.INCOME,
          amount: 10000,
          currency: Currency.ARS,
          description: 'Ingreso inicial',
        },
        {
          cashbox_id: openCashbox.id,
          type: CashMovementType.EXPENSE,
          amount: -5000,
          currency: Currency.ARS,
          description: 'Gasto operativo',
        },
      ];

      for (const movementData of movements) {
        const existingMovement = await cashMovementRepository.findOne({
          where: {
            cashbox_id: movementData.cashbox_id,
            type: movementData.type,
            amount: movementData.amount,
          },
        });
        if (!existingMovement) {
          const movement = cashMovementRepository.create(movementData);
          await cashMovementRepository.save(movement);
          console.log(`  ✅ Created cash movement`);
        }
      }
    }

    // 11. Seed Expenses (idempotent)
    console.log('📋 Seeding expenses...');
    const expenses = [
      {
        work_id: createdWorks['Obra Residencial Palermo'].id,
        supplier_id: createdSuppliers['Construcciones ABC S.A.'].id,
        rubric_id: createdRubrics['LAB'].id,
        amount: 500000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-20'),
        document_type: DocumentType.INVOICE_A,
        document_number: '0001-00001234',
        state: ExpenseState.VALIDATED,
        created_by_id: createdUsers['operator1@pmd.com'].id,
        validated_by_id: createdUsers['admin@pmd.com'].id,
        validated_at: new Date('2024-01-21'),
      },
      {
        work_id: createdWorks['Obra Residencial Palermo'].id,
        supplier_id: createdSuppliers['Materiales XYZ S.R.L.'].id,
        rubric_id: createdRubrics['MAT'].id,
        amount: 300000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-22'),
        document_type: DocumentType.INVOICE_B,
        document_number: '0001-00001235',
        state: ExpenseState.PENDING,
        created_by_id: createdUsers['operator1@pmd.com'].id,
      },
      {
        work_id: createdWorks['Edificio Corporativo Microcentro'].id,
        supplier_id: createdSuppliers['Construcciones ABC S.A.'].id,
        rubric_id: createdRubrics['SRV'].id,
        amount: 5000,
        currency: Currency.USD,
        purchase_date: new Date('2024-02-05'),
        document_type: DocumentType.VAL,
        state: ExpenseState.PENDING,
        created_by_id: createdUsers['operator2@pmd.com'].id,
      },
    ];

    for (const expenseData of expenses) {
      const existingExpense = await expenseRepository.findOne({
        where: {
          work_id: expenseData.work_id,
          document_number: expenseData.document_number,
        },
      });
      if (!existingExpense) {
        const expense = expenseRepository.create(expenseData);
        await expenseRepository.save(expense);
        console.log(`  ✅ Created expense`);
      } else {
        console.log(`  ℹ️  Expense already exists`);
      }
    }

    // 12. Seed Incomes (idempotent)
    console.log('💳 Seeding incomes...');
    const incomes = [
      {
        work_id: createdWorks['Obra Residencial Palermo'].id,
        type: IncomeType.ADVANCE,
        amount: 10000000,
        currency: Currency.ARS,
        date: new Date('2024-01-15'),
        document_number: 'CERT-001',
      },
      {
        work_id: createdWorks['Obra Residencial Palermo'].id,
        type: IncomeType.CERTIFICATION,
        amount: 5000000,
        currency: Currency.ARS,
        date: new Date('2024-02-01'),
        document_number: 'CERT-002',
      },
      {
        work_id: createdWorks['Edificio Corporativo Microcentro'].id,
        type: IncomeType.ADVANCE,
        amount: 500000,
        currency: Currency.USD,
        date: new Date('2024-02-01'),
        document_number: 'CERT-003',
      },
    ];

    for (const incomeData of incomes) {
      const existingIncome = await incomeRepository.findOne({
        where: {
          work_id: incomeData.work_id,
          document_number: incomeData.document_number,
        },
      });
      if (!existingIncome) {
        const income = incomeRepository.create(incomeData);
        await incomeRepository.save(income);
        console.log(`  ✅ Created income`);
      } else {
        console.log(`  ℹ️  Income already exists`);
      }
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📝 Default credentials:');
    console.log('  Direction:    direction@pmd.com / password123');
    console.log('  Supervisor:   supervisor@pmd.com / password123');
    console.log('  Admin:       admin@pmd.com / password123');
    console.log('  Operator 1:  operator1@pmd.com / password123');
    console.log('  Operator 2:  operator2@pmd.com / password123');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Run seed if executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✨ Seeding process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

export default seed;


