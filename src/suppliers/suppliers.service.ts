import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Supplier } from './suppliers.entity';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierStatus } from '../common/enums/supplier-status.enum';
import { SupplierDocumentType } from '../common/enums/supplier-document-type.enum';
import { SupplierType } from '../common/enums/supplier-type.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/user.entity';
import { AlertsService } from '../alerts/alerts.service';
import { AlertType, AlertSeverity } from '../common/enums';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierDocument)
    private supplierDocumentRepository: Repository<SupplierDocument>,
    private alertsService: AlertsService,
  ) {}

  /**
   * Business Rule: Operators can create provisional suppliers
   */
  async create(createSupplierDto: CreateSupplierDto, user: User): Promise<Supplier> {
    // Validate CUIT uniqueness if provided
    if (createSupplierDto.cuit) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: { cuit: createSupplierDto.cuit },
      });

      if (existingSupplier) {
        throw new BadRequestException(
          `A supplier with CUIT ${createSupplierDto.cuit} already exists`,
        );
      }
    }

    // Operators can only create provisional suppliers
    if (user.role.name === UserRole.OPERATOR) {
      createSupplierDto.status = SupplierStatus.PROVISIONAL;
    }

    const organizationId = getOrganizationId(user);
    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      created_by_id: user.id,
      organization_id: organizationId,
    });

    // Contractor fields: initialize calculated totals
    if (supplier.type === SupplierType.CONTRACTOR) {
      const budget =
        createSupplierDto.contractor_budget !== undefined
          ? Number(createSupplierDto.contractor_budget)
          : null;
      supplier.contractor_total_paid = 0;
      supplier.contractor_remaining_balance =
        budget !== null && !Number.isNaN(budget) ? budget : null;
    } else {
      // Not a contractor: keep contractor fields null to avoid confusion
      supplier.weekly_payment = null;
      supplier.contractor_budget = null;
      supplier.contractor_total_paid = null;
      supplier.contractor_remaining_balance = null;
    }

    const savedSupplier = await this.supplierRepository.save(supplier);

    // Generate alert for admin approval if provisional
    if (savedSupplier.status === SupplierStatus.PROVISIONAL) {
      await this.alertsService.createAlert({
        type: AlertType.MISSING_VALIDATION,
        severity: AlertSeverity.INFO,
        title: 'New provisional supplier requires approval',
        message: `Supplier ${savedSupplier.name} (${savedSupplier.id}) requires approval`,
        supplier_id: savedSupplier.id,
      });
    }

    return savedSupplier;
  }

  /**
   * Business Rule: Admin approval/rejection flow for provisional suppliers
   */
  async approve(id: string, user: User): Promise<Supplier> {
    // Only Administration and Direction can approve
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Solo Administración y Dirección pueden aprobar proveedores');
    }

    const supplier = await this.findOne(id, user);

    if (supplier.status !== SupplierStatus.PROVISIONAL) {
      throw new BadRequestException('Only provisional suppliers can be approved');
    }

    supplier.status = SupplierStatus.APPROVED;
    return await this.supplierRepository.save(supplier);
  }

  async reject(id: string, user: User): Promise<Supplier> {
    // Only Administration and Direction can reject
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Solo Administración y Dirección pueden rechazar proveedores');
    }

    const supplier = await this.findOne(id, user);

    if (supplier.status !== SupplierStatus.PROVISIONAL) {
      throw new BadRequestException('Only provisional suppliers can be rejected');
    }

    supplier.status = SupplierStatus.REJECTED;
    const savedSupplier = await this.supplierRepository.save(supplier);

    // Generate alert to the operator who created the supplier
    await this.alertsService.createAlert({
      type: AlertType.MISSING_VALIDATION,
      severity: AlertSeverity.WARNING,
      title: 'Supplier rejected - expenses need reassignment',
      message: `Supplier ${supplier.name} was rejected by ${user.fullName || user.email}. Please reassign related expenses or contact administration.`,
      supplier_id: supplier.id,
      user_id: supplier.created_by_id, // Alert the operator who created the supplier
    });

    return savedSupplier;
  }

  /**
   * Business Rule: Auto-block supplier when ART expires
   * Business Rule: Check ART expiration for a specific supplier
   */
  async checkDocumentExpiration(supplierId: string): Promise<boolean> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId },
      relations: ['documents'],
    });

    if (!supplier) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find ART document for this supplier
    const artDoc = await this.supplierDocumentRepository.findOne({
      where: {
        supplier_id: supplierId,
        document_type: SupplierDocumentType.ART,
        is_valid: true,
      },
    });

    if (artDoc && artDoc.expiration_date) {
      const expirationDate = new Date(artDoc.expiration_date);
      expirationDate.setHours(0, 0, 0, 0);

      // If ART is expired, block the supplier
      if (expirationDate < today && supplier.status !== SupplierStatus.BLOCKED) {
        supplier.status = SupplierStatus.BLOCKED;
        await this.supplierRepository.save(supplier);

        // Mark document as invalid
        artDoc.is_valid = false;
        await this.supplierDocumentRepository.save(artDoc);

        // Generate critical alert
        await this.alertsService.createAlert({
          type: AlertType.EXPIRED_DOCUMENTATION,
          severity: AlertSeverity.CRITICAL,
          title: 'Supplier blocked due to expired ART',
          message: `Supplier ${supplier.name} has been automatically blocked due to expired ART (expired: ${artDoc.expiration_date})`,
          supplier_id: supplier.id,
        });

        return true; // Supplier was blocked
      }
    }

    return false; // Supplier was not blocked
  }

  /**
   * Business Rule: Auto-block supplier when ART expires
   * Business Rule: Check all suppliers for expired ART documents
   */
  async checkAndBlockExpiredDocuments(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all ART documents that are expired
    const expiredArtDocuments = await this.supplierDocumentRepository.find({
      where: {
        document_type: SupplierDocumentType.ART,
        expiration_date: LessThan(today),
        is_valid: true,
      },
      relations: ['supplier'],
    });

    for (const doc of expiredArtDocuments) {
      if (doc.supplier && doc.supplier.status !== SupplierStatus.BLOCKED) {
        // Block the supplier
        doc.supplier.status = SupplierStatus.BLOCKED;
        await this.supplierRepository.save(doc.supplier);

        // Mark document as invalid
        doc.is_valid = false;
        await this.supplierDocumentRepository.save(doc);

        // Generate critical alert
        await this.alertsService.createAlert({
          type: AlertType.EXPIRED_DOCUMENTATION,
          severity: AlertSeverity.CRITICAL,
          title: 'Supplier blocked due to expired ART',
          message: `Supplier ${doc.supplier.name} has been blocked due to expired ART (expired: ${doc.expiration_date})`,
          supplier_id: doc.supplier.id,
        });
      }
    }

    // Check for documents expiring in 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = await this.supplierDocumentRepository.find({
      where: {
        document_type: SupplierDocumentType.ART,
        expiration_date: LessThan(thirtyDaysFromNow),
        is_valid: true,
      },
      relations: ['supplier'],
    });

    for (const doc of expiringSoon) {
      if (doc.supplier && doc.supplier.status === SupplierStatus.APPROVED) {
        await this.alertsService.createAlert({
          type: AlertType.EXPIRED_DOCUMENTATION,
          severity: AlertSeverity.WARNING,
          title: 'ART expiring soon',
          message: `Supplier ${doc.supplier.name} ART expires on ${doc.expiration_date}`,
          supplier_id: doc.supplier.id,
        });
      }
    }
  }

  async findAll(
    user: User,
    options?: { filterByOrganization?: boolean; type?: SupplierType },
  ): Promise<Supplier[]> {
    try {
      const organizationId = getOrganizationId(user);
      const filterByOrg = options?.filterByOrganization === true;

      const qb = this.supplierRepository
        .createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.documents', 'documents')
        .orderBy('supplier.created_at', 'DESC');

      if (filterByOrg && organizationId) {
        qb.where('supplier.organization_id = :organizationId', { organizationId });
      }

      if (options?.type) {
        qb.andWhere('supplier.type = :type', { type: options.type });
      }

      return await qb.getMany();
    } catch (error) {
      this.logger.error('Error fetching suppliers', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: ['documents', 'contracts'],
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto, user: User): Promise<Supplier> {
    const supplier = await this.findOne(id, user);

    // Validate CUIT uniqueness if provided and different from current
    if (updateSupplierDto.cuit && updateSupplierDto.cuit !== supplier.cuit) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: { cuit: updateSupplierDto.cuit },
      });

      if (existingSupplier) {
        throw new BadRequestException(
          `A supplier with CUIT ${updateSupplierDto.cuit} already exists`,
        );
      }
    }

    // Operators cannot change status
    if (user.role.name === UserRole.OPERATOR && updateSupplierDto.status) {
      throw new ForbiddenException('Los operadores no pueden cambiar el estado de los proveedores');
    }

    // Only Direction can unblock a supplier
    if (
      updateSupplierDto.status === SupplierStatus.APPROVED &&
      supplier.status === SupplierStatus.BLOCKED
    ) {
      if (user.role.name !== UserRole.DIRECTION) {
        throw new ForbiddenException(
          'Solo Dirección puede desbloquear proveedores. Por favor, contacta a Dirección para desbloquear este proveedor.',
        );
      }

      // Check if ART is still expired
      const artDoc = await this.supplierDocumentRepository.findOne({
        where: {
          supplier_id: id,
          document_type: SupplierDocumentType.ART,
        },
      });

      if (artDoc && artDoc.expiration_date && new Date(artDoc.expiration_date) < new Date()) {
        throw new BadRequestException(
          'Cannot approve supplier with expired ART. Please update ART document first.',
        );
      }
    }

    Object.assign(supplier, updateSupplierDto);

    // Enforce contractor-only fields consistency
    const effectiveType = (updateSupplierDto.type ?? supplier.type) as SupplierType | undefined;
    if (effectiveType !== SupplierType.CONTRACTOR) {
      supplier.weekly_payment = null;
      supplier.contractor_budget = null;
      supplier.contractor_total_paid = null;
      supplier.contractor_remaining_balance = null;
    } else {
      // Contractor: ensure totals exist and recalculate remaining if budget is set/updated
      const totalPaid = Number(supplier.contractor_total_paid ?? 0);
      supplier.contractor_total_paid = totalPaid;

      const budget =
        updateSupplierDto.contractor_budget !== undefined
          ? Number(updateSupplierDto.contractor_budget)
          : supplier.contractor_budget !== undefined && supplier.contractor_budget !== null
            ? Number(supplier.contractor_budget)
            : null;

      supplier.contractor_remaining_balance =
        budget !== null && !Number.isNaN(budget) ? Number(budget) - totalPaid : null;
    }

    const savedSupplier = await this.supplierRepository.save(supplier);

    // Check ART expiration after update (in case document was updated)
    await this.checkDocumentExpiration(id);

    return savedSupplier;
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete suppliers
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Solo Dirección puede eliminar proveedores');
    }

    const supplier = await this.findOne(id, user);
    await this.supplierRepository.remove(supplier);
  }
}

