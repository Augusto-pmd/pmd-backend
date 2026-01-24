import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employees.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { EmployeeTrade } from '../common/enums/employee-trade.enum';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  /**
   * Find all employees.
   * filterByOrganization: optional. Default false = show all. When true, filter by user's organization_id.
   */
  async findAll(
    user: User,
    filters?: {
      filterByOrganization?: boolean;
      work_id?: string;
      trade?: EmployeeTrade;
      isActive?: boolean;
    },
  ): Promise<Employee[]> {
    try {
      const organizationId = getOrganizationId(user);
      const qb = this.employeeRepository
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.work', 'work')
        .leftJoinAndSelect('employee.organization', 'organization')
        .orderBy('employee.created_at', 'DESC');

      if (filters?.filterByOrganization === true && organizationId) {
        qb.andWhere('employee.organization_id = :organizationId', {
          organizationId,
        });
      }

      if (filters?.work_id) {
        qb.andWhere('employee.work_id = :work_id', {
          work_id: filters.work_id,
        });
      }

      if (filters?.trade) {
        qb.andWhere('employee.trade = :trade', { trade: filters.trade });
      }

      if (filters?.isActive !== undefined) {
        qb.andWhere('employee.isActive = :isActive', {
          isActive: filters.isActive,
        });
      }

      return await qb.getMany();
    } catch (error) {
      this.logger.error('Error fetching employees', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['work', 'organization'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async create(createEmployeeDto: CreateEmployeeDto, user: User): Promise<Employee> {
    const organizationId = getOrganizationId(user);
    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      organization_id: organizationId,
      isActive: createEmployeeDto.isActive ?? true,
    });

    if (createEmployeeDto.hireDate) {
      employee.hireDate = new Date(createEmployeeDto.hireDate);
    }

    return await this.employeeRepository.save(employee);
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    user: User,
  ): Promise<Employee> {
    const employee = await this.findOne(id, user);

    Object.assign(employee, updateEmployeeDto);

    if (updateEmployeeDto.hireDate !== undefined) {
      employee.hireDate = updateEmployeeDto.hireDate
        ? new Date(updateEmployeeDto.hireDate)
        : null;
    }

    return await this.employeeRepository.save(employee);
  }

  /**
   * Soft delete: set isActive = false.
   * Only DIRECTION can delete.
   */
  async remove(id: string, user: User): Promise<void> {
    if (user.role?.name !== UserRole.DIRECTION) {
      throw new ForbiddenException(
        'Solo Dirección puede eliminar empleados',
      );
    }

    const employee = await this.findOne(id, user);
    employee.isActive = false;
    await this.employeeRepository.save(employee);
  }
}
