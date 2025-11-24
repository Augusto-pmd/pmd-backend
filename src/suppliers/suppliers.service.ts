import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Supplier } from './suppliers.entity';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierStatus } from '../common/enums/supplier-status.enum';
import { SupplierDocumentType } from '../common/enums/supplier-document-type.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/users.entity';
import { AlertsService } from '../alerts/alerts.service';
import { AlertType, AlertSeverity } from '../common/enums';

@Injectable()
export class SuppliersService {
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
    // Operators can only create provisional suppliers
    if (user.role.name === UserRole.OPERATOR) {
      createSupplierDto.status = SupplierStatus.PROVISIONAL;
    }

    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      created_by_id: user.id,
    });

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
      throw new ForbiddenException('Only Administration and Direction can approve suppliers');
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
      throw new ForbiddenException('Only Administration and Direction can reject suppliers');
    }

    const supplier = await this.findOne(id, user);

    if (supplier.status !== SupplierStatus.PROVISIONAL) {
      throw new BadRequestException('Only provisional suppliers can be rejected');
    }

    supplier.status = SupplierStatus.REJECTED;
    const savedSupplier = await this.supplierRepository.save(supplier);

    // Generate alert that expenses need to be reassigned
    await this.alertsService.createAlert({
      type: AlertType.MISSING_VALIDATION,
      severity: AlertSeverity.WARNING,
      title: 'Supplier rejected - expenses need reassignment',
      message: `Supplier ${supplier.name} was rejected. Please reassign related expenses.`,
      supplier_id: supplier.id,
    });

    return savedSupplier;
  }

  /**
   * Business Rule: Auto-block supplier when ART expires
   */
  async checkAndBlockExpiredDocuments(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all ART documents that are expired or expiring soon
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

  async findAll(user: User): Promise<Supplier[]> {
    return await this.supplierRepository.find({
      relations: ['documents'],
      order: { created_at: 'DESC' },
    });
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

    // Operators cannot change status
    if (user.role.name === UserRole.OPERATOR && updateSupplierDto.status) {
      throw new ForbiddenException('Operators cannot change supplier status');
    }

    // Check if trying to use blocked supplier
    if (
      updateSupplierDto.status === SupplierStatus.APPROVED &&
      supplier.status === SupplierStatus.BLOCKED
    ) {
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
    return await this.supplierRepository.save(supplier);
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete suppliers
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can delete suppliers');
    }

    const supplier = await this.findOne(id, user);
    await this.supplierRepository.remove(supplier);
  }
}

