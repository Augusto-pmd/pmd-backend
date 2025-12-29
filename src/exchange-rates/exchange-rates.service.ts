import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRate } from './exchange-rates.entity';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class ExchangeRatesService {
  constructor(
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
  ) {}

  /**
   * Create a new exchange rate
   * Business Rule: Only Administration can create exchange rates
   * Business Rule: Date must be unique (one rate per day)
   */
  async create(
    createExchangeRateDto: CreateExchangeRateDto,
    user: User,
  ): Promise<ExchangeRate> {
    // Only Administration can create exchange rates
    if (user.role.name !== UserRole.ADMINISTRATION) {
      throw new ForbiddenException('Only Administration can create exchange rates');
    }

    // Check if exchange rate already exists for this date
    const existingRate = await this.exchangeRateRepository.findOne({
      where: { date: new Date(createExchangeRateDto.date) },
    });

    if (existingRate) {
      throw new ConflictException(
        `Exchange rate already exists for date ${createExchangeRateDto.date}`,
      );
    }

    const exchangeRate = this.exchangeRateRepository.create({
      ...createExchangeRateDto,
      date: new Date(createExchangeRateDto.date),
      created_by_id: user.id,
    });

    return await this.exchangeRateRepository.save(exchangeRate);
  }

  /**
   * Get current exchange rate (most recent date)
   */
  async getCurrentRate(): Promise<ExchangeRate | null> {
    const rate = await this.exchangeRateRepository.findOne({
      where: {},
      order: { date: 'DESC' },
      relations: ['created_by'],
    });

    return rate;
  }

  /**
   * Get exchange rate by date
   */
  async getRateByDate(date: Date | string): Promise<ExchangeRate | null> {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    targetDate.setHours(0, 0, 0, 0);

    const rate = await this.exchangeRateRepository.findOne({
      where: { date: targetDate },
      relations: ['created_by'],
    });

    return rate;
  }

  /**
   * Get exchange rate by date or get the most recent one if not found
   */
  async getRateByDateOrCurrent(date?: Date | string): Promise<ExchangeRate | null> {
    if (date) {
      const rate = await this.getRateByDate(date);
      if (rate) return rate;
    }

    // If no date provided or rate not found for date, return current
    return await this.getCurrentRate();
  }

  /**
   * Find all exchange rates
   */
  async findAll(): Promise<ExchangeRate[]> {
    return await this.exchangeRateRepository.find({
      order: { date: 'DESC' },
      relations: ['created_by'],
    });
  }

  /**
   * Find one exchange rate by ID
   */
  async findOne(id: string): Promise<ExchangeRate> {
    const rate = await this.exchangeRateRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (!rate) {
      throw new NotFoundException(`Exchange rate with ID ${id} not found`);
    }

    return rate;
  }

  /**
   * Update exchange rate
   * Business Rule: Only Administration can update exchange rates
   */
  async update(
    id: string,
    updateExchangeRateDto: UpdateExchangeRateDto,
    user: User,
  ): Promise<ExchangeRate> {
    // Only Administration can update exchange rates
    if (user.role.name !== UserRole.ADMINISTRATION) {
      throw new ForbiddenException('Only Administration can update exchange rates');
    }

    const rate = await this.findOne(id);

    // If date is being updated, check for conflicts
    if (updateExchangeRateDto.date) {
      const newDate = new Date(updateExchangeRateDto.date);
      const existingRate = await this.exchangeRateRepository.findOne({
        where: { date: newDate },
      });

      if (existingRate && existingRate.id !== id) {
        throw new ConflictException(
          `Exchange rate already exists for date ${updateExchangeRateDto.date}`,
        );
      }

      rate.date = newDate;
    }

    if (updateExchangeRateDto.rate_ars_to_usd !== undefined) {
      rate.rate_ars_to_usd = updateExchangeRateDto.rate_ars_to_usd;
    }

    if (updateExchangeRateDto.rate_usd_to_ars !== undefined) {
      rate.rate_usd_to_ars = updateExchangeRateDto.rate_usd_to_ars;
    }

    return await this.exchangeRateRepository.save(rate);
  }

  /**
   * Delete exchange rate
   * Business Rule: Only Administration can delete exchange rates
   */
  async remove(id: string, user: User): Promise<void> {
    // Only Administration can delete exchange rates
    if (user.role.name !== UserRole.ADMINISTRATION) {
      throw new ForbiddenException('Only Administration can delete exchange rates');
    }

    const rate = await this.findOne(id);
    await this.exchangeRateRepository.remove(rate);
  }
}

