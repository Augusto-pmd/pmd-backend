import { Injectable, Logger } from '@nestjs/common';
import { FiscalCondition } from '../common/enums/fiscal-condition.enum';
import { DocumentType } from '../common/enums/document-type.enum';

export interface TaxCalculations {
  vat_perception: number;
  vat_withholding: number;
  iibb_perception: number;
  income_tax_withholding: number;
  is_auto_calculated: boolean;
  calculation_rules?: string[];
}

/**
 * Service for automatic calculation of perceptions and withholdings
 * Based on supplier fiscal condition and document type
 */
@Injectable()
export class CalculationsService {
  private readonly logger = new Logger(CalculationsService.name);

  // Default tax rates (can be configured)
  private readonly VAT_PERCEPTION_RATE = 0.10; // 10% - Percepción IVA
  private readonly VAT_WITHHOLDING_RATE = 0.00; // 0% - Retención IVA (usually not applied)
  private readonly IIBB_PERCEPTION_RATE = 0.035; // 3.5% - Percepción IIBB
  private readonly INCOME_TAX_WITHHOLDING_RATE = 0.00; // 0% - Retención Ganancias (varies by activity)

  /**
   * Calculate perceptions and withholdings based on supplier fiscal condition and document type
   */
  calculateTaxes(
    amount: number,
    fiscalCondition?: FiscalCondition | null,
    documentType?: DocumentType,
  ): TaxCalculations {
    const calculations: TaxCalculations = {
      vat_perception: 0,
      vat_withholding: 0,
      iibb_perception: 0,
      income_tax_withholding: 0,
      is_auto_calculated: true,
      calculation_rules: [],
    };

    // If no fiscal condition, return zeros
    if (!fiscalCondition) {
      calculations.calculation_rules?.push('No fiscal condition specified - no taxes calculated');
      return calculations;
    }

    // If document type is C, receipt, or VAL, no perceptions/withholdings apply
    if (
      documentType === DocumentType.INVOICE_C ||
      documentType === DocumentType.RECEIPT ||
      documentType === DocumentType.VAL
    ) {
      calculations.calculation_rules?.push(
        `Document type ${documentType} does not require perceptions/withholdings`,
      );
      return calculations;
    }

    // Calculate based on fiscal condition
    switch (fiscalCondition) {
      case FiscalCondition.RI: // Responsable Inscripto
        // RI can have VAT perception and IIBB perception
        if (documentType === DocumentType.INVOICE_A || documentType === DocumentType.INVOICE_B) {
          calculations.vat_perception = amount * this.VAT_PERCEPTION_RATE;
          calculations.iibb_perception = amount * this.IIBB_PERCEPTION_RATE;
          calculations.calculation_rules?.push(
            `RI supplier: VAT perception ${(this.VAT_PERCEPTION_RATE * 100).toFixed(1)}%, IIBB perception ${(this.IIBB_PERCEPTION_RATE * 100).toFixed(2)}%`,
          );
        }
        break;

      case FiscalCondition.MONOTRIBUTISTA:
        // Monotributistas generally don't have perceptions/withholdings
        calculations.calculation_rules?.push(
          'Monotributista supplier: No perceptions/withholdings apply',
        );
        break;

      case FiscalCondition.EXEMPT:
        // Exempt suppliers don't have perceptions/withholdings
        calculations.calculation_rules?.push(
          'Exempt supplier: No perceptions/withholdings apply',
        );
        break;

      case FiscalCondition.OTHER:
        // For "Other", apply default rates if document is A or B
        if (documentType === DocumentType.INVOICE_A || documentType === DocumentType.INVOICE_B) {
          calculations.vat_perception = amount * this.VAT_PERCEPTION_RATE;
          calculations.iibb_perception = amount * this.IIBB_PERCEPTION_RATE;
          calculations.calculation_rules?.push(
            `Other fiscal condition: Applying default rates (VAT ${(this.VAT_PERCEPTION_RATE * 100).toFixed(1)}%, IIBB ${(this.IIBB_PERCEPTION_RATE * 100).toFixed(2)}%)`,
          );
        }
        break;

      default:
        calculations.calculation_rules?.push(
          `Unknown fiscal condition: ${fiscalCondition} - No taxes calculated`,
        );
    }

    // Round to 2 decimal places
    calculations.vat_perception = Math.round(calculations.vat_perception * 100) / 100;
    calculations.vat_withholding = Math.round(calculations.vat_withholding * 100) / 100;
    calculations.iibb_perception = Math.round(calculations.iibb_perception * 100) / 100;
    calculations.income_tax_withholding = Math.round(calculations.income_tax_withholding * 100) / 100;

    return calculations;
  }

  /**
   * Validate manual tax calculations
   */
  validateTaxCalculations(
    amount: number,
    vat_perception?: number,
    vat_withholding?: number,
    iibb_perception?: number,
    income_tax_withholding?: number,
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that all values are non-negative
    if (vat_perception !== undefined && vat_perception < 0) {
      errors.push('VAT perception cannot be negative');
    }
    if (vat_withholding !== undefined && vat_withholding < 0) {
      errors.push('VAT withholding cannot be negative');
    }
    if (iibb_perception !== undefined && iibb_perception < 0) {
      errors.push('IIBB perception cannot be negative');
    }
    if (income_tax_withholding !== undefined && income_tax_withholding < 0) {
      errors.push('Income tax withholding cannot be negative');
    }

    // Check that taxes don't exceed amount (reasonable check)
    const totalTaxes =
      (vat_perception || 0) +
      (vat_withholding || 0) +
      (iibb_perception || 0) +
      (income_tax_withholding || 0);

    if (totalTaxes > amount * 0.5) {
      // Warning if taxes exceed 50% of amount (unusual but not necessarily wrong)
      errors.push(
        'Warning: Total taxes exceed 50% of amount. Please verify calculations.',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get calculation rules explanation for a given fiscal condition and document type
   */
  getCalculationRulesExplanation(
    fiscalCondition?: FiscalCondition | null,
    documentType?: DocumentType,
  ): string {
    if (!fiscalCondition) {
      return 'No fiscal condition specified. No automatic calculations will be applied.';
    }

    if (
      documentType === DocumentType.INVOICE_C ||
      documentType === DocumentType.RECEIPT ||
      documentType === DocumentType.VAL
    ) {
      return `Document type ${documentType} does not require perceptions or withholdings.`;
    }

    switch (fiscalCondition) {
      case FiscalCondition.RI:
        if (documentType === DocumentType.INVOICE_A || documentType === DocumentType.INVOICE_B) {
          return `Responsable Inscripto (RI): VAT perception ${(this.VAT_PERCEPTION_RATE * 100).toFixed(1)}% and IIBB perception ${(this.IIBB_PERCEPTION_RATE * 100).toFixed(2)}% apply to invoices A and B.`;
        }
        return 'Responsable Inscripto (RI): No perceptions/withholdings apply to this document type.';
      case FiscalCondition.MONOTRIBUTISTA:
        return 'Monotributista: No perceptions or withholdings apply.';
      case FiscalCondition.EXEMPT:
        return 'Exempt: No perceptions or withholdings apply.';
      case FiscalCondition.OTHER:
        if (documentType === DocumentType.INVOICE_A || documentType === DocumentType.INVOICE_B) {
          return `Other fiscal condition: Default rates apply (VAT ${(this.VAT_PERCEPTION_RATE * 100).toFixed(1)}%, IIBB ${(this.IIBB_PERCEPTION_RATE * 100).toFixed(2)}%).`;
        }
        return 'Other fiscal condition: No perceptions/withholdings apply to this document type.';
      default:
        return 'Unknown fiscal condition. No automatic calculations will be applied.';
    }
  }
}

