import { AccountingRecord } from '../accounting.entity';

/**
 * Interface for Perceptions Report response
 */
export interface PerceptionsReport {
  total_vat_perception: number;
  total_iibb_perception: number;
  records: AccountingRecord[];
}

/**
 * Interface for Withholdings Report response
 */
export interface WithholdingsReport {
  total_vat_withholding: number;
  total_income_tax_withholding: number;
  records: AccountingRecord[];
}

