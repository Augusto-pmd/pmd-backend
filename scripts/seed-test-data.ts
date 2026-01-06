import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import dataSource from '../src/data-source';
import { User } from '../src/users/user.entity';
import { Role } from '../src/roles/role.entity';
import { Organization } from '../src/organizations/organization.entity';
import { Work } from '../src/works/works.entity';
import { Supplier } from '../src/suppliers/suppliers.entity';
import { SupplierDocument } from '../src/supplier-documents/supplier-documents.entity';
import { Contract } from '../src/contracts/contracts.entity';
import { Expense } from '../src/expenses/expenses.entity';
import { Rubric } from '../src/rubrics/rubrics.entity';
import { Cashbox } from '../src/cashboxes/cashboxes.entity';
import { UserRole } from '../src/common/enums/user-role.enum';
import { SupplierStatus } from '../src/common/enums/supplier-status.enum';
import { SupplierDocumentType } from '../src/common/enums/supplier-document-type.enum';
import { Currency } from '../src/common/enums/currency.enum';
import { WorkStatus } from '../src/common/enums/work-status.enum';
import { ExpenseState } from '../src/common/enums/expense-state.enum';
import { DocumentType } from '../src/common/enums/document-type.enum';
import { CashboxStatus } from '../src/common/enums/cashbox-status.enum';

// Load environment variables
config();

/**
 * Script para crear datos de prueba completos en la base de datos
 * 
 * Crea:
 * - Usuarios de prueba para cada rol (Direction, Supervisor, Administration, Operator)
 * - Obras de prueba
 * - Proveedores de prueba (aprobados y provisionales)
 * - Contratos de prueba
 * - Gastos de prueba (pendientes y validados)
 * - Cajas de prueba
 * - Rúbricas básicas
 */
async function seedTestData() {
  console.log('🌱 Iniciando seed de datos de prueba...\n');

  const AppDataSource = dataSource;
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Conectado a la base de datos\n');

    // Ejecutar migraciones pendientes
    console.log('🔄 Ejecutando migraciones pendientes...\n');
    const pendingMigrations = await AppDataSource.runMigrations();
    if (pendingMigrations.length > 0) {
      console.log(`✅ ${pendingMigrations.length} migración(es) ejecutada(s)\n`);
    }

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);
    const orgRepository = AppDataSource.getRepository(Organization);
    const workRepository = AppDataSource.getRepository(Work);
    const supplierRepository = AppDataSource.getRepository(Supplier);
    const supplierDocumentRepository = AppDataSource.getRepository(SupplierDocument);
    const contractRepository = AppDataSource.getRepository(Contract);
    const expenseRepository = AppDataSource.getRepository(Expense);
    const rubricRepository = AppDataSource.getRepository(Rubric);
    const cashboxRepository = AppDataSource.getRepository(Cashbox);

    // 1. Organización por defecto
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
    }

    // 2. Crear roles si no existen
    const rolesToCreate = [
      { name: UserRole.DIRECTION, description: 'Rol de dirección' },
      { name: UserRole.SUPERVISOR, description: 'Rol de supervisión' },
      { name: UserRole.ADMINISTRATION, description: 'Rol de administración' },
      { name: UserRole.OPERATOR, description: 'Rol de operador' },
    ];

    const createdRoles: { [key: string]: Role } = {};
    
    for (const roleData of rolesToCreate) {
      let role = await roleRepository.findOne({ where: { name: roleData.name } });
      
      if (!role) {
        role = roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.name === UserRole.DIRECTION ? { all: true } : {},
        });
        role = await roleRepository.save(role);
        console.log(`✅ Rol creado: ${roleData.name}`);
      }
      
      createdRoles[roleData.name] = role;
    }

    // 3. Crear usuarios de prueba
    const testUsers = [
      {
        email: 'direction@pmd.com',
        password: 'password123',
        fullName: 'Usuario Direction',
        role: UserRole.DIRECTION,
      },
      {
        email: 'supervisor@pmd.com',
        password: 'password123',
        fullName: 'Usuario Supervisor',
        role: UserRole.SUPERVISOR,
      },
      {
        email: 'admin@pmd.com',
        password: 'password123',
        fullName: 'Usuario Administration',
        role: UserRole.ADMINISTRATION,
      },
      {
        email: 'operator@pmd.com',
        password: 'password123',
        fullName: 'Operador 1',
        role: UserRole.OPERATOR,
      },
    ];

    const createdUsers: { [key: string]: User } = {};
    
    for (const userData of testUsers) {
      let user = await userRepository.findOne({ 
        where: { email: userData.email },
        relations: ['role'],
      });

      if (!user) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user = userRepository.create({
          email: userData.email,
          password: hashedPassword,
          fullName: userData.fullName,
          role: createdRoles[userData.role],
          organization: defaultOrg,
          isActive: true,
        });
        user = await userRepository.save(user);
        console.log(`✅ Usuario creado: ${userData.email}`);
      } else {
        // Actualizar si es necesario
        if (!user.role || user.role.name !== userData.role) {
          user.role = createdRoles[userData.role];
          await userRepository.save(user);
        }
        console.log(`ℹ️  Usuario ya existe: ${userData.email}`);
      }
      
      createdUsers[userData.email] = user;
    }

    // 4. Crear rúbricas básicas
    const rubrics = [
      { name: 'Materiales', code: 'MAT' },
      { name: 'Mano de Obra', code: 'MO' },
      { name: 'Servicios', code: 'SERV' },
      { name: 'Equipamiento', code: 'EQ' },
    ];

    const createdRubrics: Rubric[] = [];
    for (const rubricData of rubrics) {
      let rubric = await rubricRepository.findOne({ where: { code: rubricData.code } });
      
      if (!rubric) {
        rubric = rubricRepository.create({
          name: rubricData.name,
          code: rubricData.code,
        });
        rubric = await rubricRepository.save(rubric);
        console.log(`✅ Rúbrica creada: ${rubricData.name}`);
      }
      
      createdRubrics.push(rubric);
    }

    // 5. Crear obras de prueba
    const works = [
      {
        name: 'Obra Test 1 - Residencial',
        client: 'Cliente Test 1',
        address: 'Av. Test 123, CABA',
        currency: Currency.ARS,
        status: WorkStatus.ACTIVE,
        supervisor: createdUsers['supervisor@pmd.com'],
      },
      {
        name: 'Obra Test 2 - Comercial',
        client: 'Cliente Test 2',
        address: 'Av. Test 456, CABA',
        currency: Currency.USD,
        status: WorkStatus.ACTIVE,
        supervisor: createdUsers['supervisor@pmd.com'],
      },
    ];

    const createdWorks: Work[] = [];
    for (const workData of works) {
      // Buscar usando QueryBuilder para evitar problemas con columnas que no existen en BD
      // Seleccionar solo las columnas que existen
      let work = await workRepository
        .createQueryBuilder('work')
        .select([
          'work.id',
          'work.name',
          'work.client',
          'work.address',
          'work.start_date',
          'work.end_date',
          'work.status',
          'work.currency',
          'work.supervisor_id',
          'work.organization_id',
          'work.total_budget',
          'work.total_expenses',
          'work.total_incomes',
          'work.physical_progress',
          'work.economic_progress',
          'work.financial_progress',
        ])
        .where('work.name = :name', { name: workData.name })
        .getOne();
      
      if (!work) {
        // Crear obra usando la entidad normalmente
        // Nota: Si work_type no existe en BD, ejecutar primero la migración 1700000000028
        work = workRepository.create({
          name: workData.name,
          client: workData.client,
          address: workData.address,
          start_date: new Date(),
          currency: workData.currency,
          status: workData.status,
          supervisor: workData.supervisor,
          organization: defaultOrg,
          total_budget: 1000000,
          total_expenses: 0,
          total_incomes: 0,
          // work_type es opcional, no lo incluimos en el seed
        });
        
        try {
          work = await workRepository.save(work);
          console.log(`✅ Obra creada: ${workData.name}`);
        } catch (error: any) {
          // Si falla por work_type, usar SQL directo como fallback
          if (error.message?.includes('work_type')) {
            console.log(`⚠️  work_type no existe en BD, usando SQL directo para: ${workData.name}`);
            const startDate = new Date().toISOString().split('T')[0];
            
            const insertResult = await AppDataSource.query(
              `INSERT INTO "works" (
                "name", "client", "address", "start_date", "status", "currency",
                "supervisor_id", "organization_id", "total_budget", "total_expenses",
                "total_incomes", "physical_progress", "economic_progress", "financial_progress"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              RETURNING "id"`,
              [
                workData.name,
                workData.client,
                workData.address,
                startDate,
                workData.status,
                workData.currency,
                workData.supervisor.id,
                defaultOrg.id,
                1000000,
                0,
                0,
                0,
                0,
                0,
              ]
            );
            
            // Obtener la obra recién creada
            work = await workRepository
              .createQueryBuilder('work')
              .select([
                'work.id',
                'work.name',
                'work.client',
                'work.address',
                'work.start_date',
                'work.end_date',
                'work.status',
                'work.currency',
                'work.supervisor_id',
                'work.organization_id',
                'work.total_budget',
                'work.total_expenses',
                'work.total_incomes',
                'work.physical_progress',
                'work.economic_progress',
                'work.financial_progress',
              ])
              .where('work.id = :id', { id: insertResult[0].id })
              .getOne();
            
            if (!work) {
              throw new Error(`No se pudo recuperar la obra creada: ${workData.name}`);
            }
            
            console.log(`✅ Obra creada (fallback SQL): ${workData.name}`);
          } else {
            throw error;
          }
        }
      } else {
        console.log(`ℹ️  Obra ya existe: ${workData.name}`);
      }
      
      if (!work) {
        throw new Error(`No se pudo crear o recuperar la obra: ${workData.name}`);
      }
      
      createdWorks.push(work);
    }

    // 6. Crear proveedores de prueba
    const suppliers = [
      {
        name: 'Proveedor Aprobado 1',
        cuit: '20-12345678-9',
        email: 'proveedor1@test.com',
        phone: '11-1234-5678',
        status: SupplierStatus.APPROVED,
        category: 'Construcción',
      },
      {
        name: 'Proveedor Aprobado 2',
        cuit: '20-87654321-0',
        email: 'proveedor2@test.com',
        phone: '11-8765-4321',
        status: SupplierStatus.APPROVED,
        category: 'Materiales',
      },
      {
        name: 'Proveedor Provisional',
        cuit: '20-11111111-1',
        email: 'proveedor3@test.com',
        status: SupplierStatus.PROVISIONAL,
        category: 'Servicios',
        createdBy: createdUsers['operator@pmd.com'],
      },
    ];

    const createdSuppliers: Supplier[] = [];
    for (const supplierData of suppliers) {
      let supplier = await supplierRepository.findOne({ where: { cuit: supplierData.cuit } });
      
      if (!supplier) {
        supplier = supplierRepository.create({
          name: supplierData.name,
          cuit: supplierData.cuit,
          email: supplierData.email,
          phone: supplierData.phone || undefined,
          status: supplierData.status,
          category: supplierData.category,
          organization: defaultOrg,
          created_by_id: supplierData.createdBy?.id || undefined,
        } as Partial<Supplier>);
        supplier = await supplierRepository.save(supplier);
        console.log(`✅ Proveedor creado: ${supplierData.name}`);
        
        // Crear documento ART para proveedores aprobados
        if (supplierData.status === SupplierStatus.APPROVED) {
          const artDocument = supplierDocumentRepository.create({
            supplier: supplier,
            document_type: SupplierDocumentType.ART,
            expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año desde ahora
          });
          await supplierDocumentRepository.save(artDocument);
          console.log(`   └─ Documento ART creado`);
        }
      }
      
      createdSuppliers.push(supplier);
    }

    // 7. Crear contratos de prueba
    if (createdWorks.length > 0 && createdSuppliers.length > 0 && createdRubrics.length > 0) {
      const contracts = [
        {
          supplier: createdSuppliers[0],
          work: createdWorks[0],
          rubric: createdRubrics[0], // Materiales
          amount_total: 500000,
          amount_executed: 0,
          currency: Currency.ARS,
          start_date: new Date(),
          end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 meses
        },
        {
          supplier: createdSuppliers[1],
          work: createdWorks[0],
          rubric: createdRubrics[1], // Mano de Obra
          amount_total: 300000,
          amount_executed: 100000,
          currency: Currency.ARS,
          start_date: new Date(),
          end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        },
      ];

      for (const contractData of contracts) {
        let contract = await contractRepository.findOne({
          where: {
            supplier: { id: contractData.supplier.id },
            work: { id: contractData.work.id },
          },
        });
        
        if (!contract) {
          contract = contractRepository.create({
            supplier: contractData.supplier,
            work: contractData.work,
            rubric: contractData.rubric,
            amount_total: contractData.amount_total,
            amount_executed: contractData.amount_executed,
            currency: contractData.currency,
            start_date: contractData.start_date,
            end_date: contractData.end_date,
            is_blocked: contractData.amount_executed >= contractData.amount_total,
          });
          contract = await contractRepository.save(contract);
          console.log(`✅ Contrato creado: ${contractData.supplier.name} - ${contractData.work.name}`);
        }
      }
    }

    // 8. Crear gastos de prueba
    if (createdWorks.length > 0 && createdRubrics.length > 0 && createdSuppliers.length > 0) {
      const expenses = [
        {
          work: createdWorks[0],
          supplier: createdSuppliers[0],
          rubric: createdRubrics[0],
          amount: 50000,
          currency: Currency.ARS,
          document_type: DocumentType.INVOICE_A,
          document_number: '001-00000001',
          state: ExpenseState.PENDING,
          createdBy: createdUsers['operator@pmd.com'],
        },
        {
          work: createdWorks[0],
          supplier: createdSuppliers[0],
          rubric: createdRubrics[1],
          amount: 30000,
          currency: Currency.ARS,
          document_type: DocumentType.INVOICE_A,
          document_number: '001-00000002',
          state: ExpenseState.VALIDATED,
          createdBy: createdUsers['operator@pmd.com'],
        },
        {
          work: createdWorks[0],
          supplier: null,
          rubric: createdRubrics[2],
          amount: 15000,
          currency: Currency.ARS,
          document_type: DocumentType.VAL,
          state: ExpenseState.PENDING,
          createdBy: createdUsers['operator@pmd.com'],
        },
      ];

      for (const expenseData of expenses) {
        // Usar QueryBuilder con select específico para evitar columnas que no existen en BD
        let expense = await expenseRepository
          .createQueryBuilder('expense')
          .select([
            'expense.id',
            'expense.work_id',
            'expense.supplier_id',
            'expense.contract_id',
            'expense.rubric_id',
            'expense.amount',
            'expense.currency',
            'expense.purchase_date',
            'expense.document_type',
            'expense.document_number',
            'expense.state',
            'expense.file_url',
            'expense.observations',
            'expense.created_by_id',
            'expense.validated_by_id',
            'expense.validated_at',
            'expense.vat_amount',
            'expense.vat_rate',
            'expense.vat_perception',
            'expense.vat_withholding',
            'expense.iibb_perception',
            'expense.income_tax_withholding',
            'expense.created_at',
            'expense.updated_at',
          ])
          .where('expense.work_id = :workId', { workId: expenseData.work.id })
          .andWhere(
            expenseData.document_number
              ? 'expense.document_number = :docNumber'
              : 'expense.document_number IS NULL',
            expenseData.document_number ? { docNumber: expenseData.document_number } : {}
          )
          .getOne();
        
        if (!expense) {
          // Usar SQL directo para evitar que TypeORM incluya is_post_closure que no existe en BD
          const purchaseDate = new Date().toISOString().split('T')[0];
          
          try {
            // Intentar crear usando la entidad primero
            expense = expenseRepository.create({
              work: expenseData.work,
              supplier: expenseData.supplier || undefined,
              rubric: expenseData.rubric,
              amount: expenseData.amount,
              currency: expenseData.currency,
              purchase_date: new Date(),
              document_type: expenseData.document_type,
              document_number: expenseData.document_number || undefined,
              state: expenseData.state,
              created_by_id: expenseData.createdBy.id,
            } as Partial<Expense>);
            expense = await expenseRepository.save(expense);
            console.log(`✅ Gasto creado: $${expenseData.amount} - ${expenseData.state}`);
          } catch (error: any) {
            // Si falla por is_post_closure, usar SQL directo como fallback
            if (error.message?.includes('is_post_closure')) {
              const insertResult = await AppDataSource.query(
                `INSERT INTO "expenses" (
                  "work_id", "supplier_id", "rubric_id", "amount", "currency",
                  "purchase_date", "document_type", "document_number", "state", "created_by_id"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING "id"`,
                [
                  expenseData.work.id,
                  expenseData.supplier?.id || null,
                  expenseData.rubric.id,
                  expenseData.amount,
                  expenseData.currency,
                  purchaseDate,
                  expenseData.document_type,
                  expenseData.document_number || null,
                  expenseData.state,
                  expenseData.createdBy.id,
                ]
              );
              
              // Obtener el expense recién creado
              expense = await expenseRepository
                .createQueryBuilder('expense')
                .select([
                  'expense.id',
                  'expense.work_id',
                  'expense.supplier_id',
                  'expense.contract_id',
                  'expense.rubric_id',
                  'expense.amount',
                  'expense.currency',
                  'expense.purchase_date',
                  'expense.document_type',
                  'expense.document_number',
                  'expense.state',
                  'expense.file_url',
                  'expense.observations',
                  'expense.created_by_id',
                  'expense.validated_by_id',
                  'expense.validated_at',
                  'expense.vat_amount',
                  'expense.vat_rate',
                  'expense.vat_perception',
                  'expense.vat_withholding',
                  'expense.iibb_perception',
                  'expense.income_tax_withholding',
                  'expense.created_at',
                  'expense.updated_at',
                ])
                .where('expense.id = :id', { id: insertResult[0].id })
                .getOne();
              
              console.log(`✅ Gasto creado (fallback SQL): $${expenseData.amount} - ${expenseData.state}`);
            } else {
              throw error;
            }
          }
        }
      }
    }

    // 9. Crear cajas de prueba
    const cashboxes = [
      {
        user: createdUsers['operator@pmd.com'],
        opening_balance_ars: 10000,
        opening_balance_usd: 100,
        status: CashboxStatus.OPEN,
      },
    ];

    for (const cashboxData of cashboxes) {
      // Verificar si ya tiene una caja abierta
      const existingOpenCashbox = await cashboxRepository.findOne({
        where: {
          user: { id: cashboxData.user.id },
          status: CashboxStatus.OPEN,
        },
      });
      
      if (!existingOpenCashbox) {
        const cashbox = cashboxRepository.create({
          user: cashboxData.user,
          opening_balance_ars: cashboxData.opening_balance_ars,
          opening_balance_usd: cashboxData.opening_balance_usd,
          status: cashboxData.status,
          opening_date: new Date(),
        });
        await cashboxRepository.save(cashbox);
        console.log(`✅ Caja creada para: ${cashboxData.user.email}`);
      } else {
        console.log(`ℹ️  Usuario ${cashboxData.user.email} ya tiene una caja abierta`);
      }
    }

    console.log('\n📋 Credenciales de usuarios de prueba:');
    console.log('========================================');
    testUsers.forEach(user => {
      console.log(`   ${user.email} / ${user.password} (${user.role})`);
    });
    console.log('\n✅ Seed de datos de prueba completado exitosamente!\n');

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
seedTestData()
  .then(() => {
    console.log('✨ Proceso de seed finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en seed:', error);
    process.exit(1);
  });

