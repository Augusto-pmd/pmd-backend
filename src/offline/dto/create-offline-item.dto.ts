import { IsString, IsObject, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOfflineItemDto {
  @ApiProperty({
    description: 'Type of the offline item (e.g., "expense", "income", "work")',
    example: 'expense',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  item_type: string;

  @ApiProperty({
    description: 'Data payload for the offline item (JSON object)',
    example: {
      action: 'create',
      entity: 'expense',
      payload: {
        amount: 1000,
        currency: 'ARS',
        supplier_id: 'supplier-123',
      },
    },
    type: Object,
  })
  @IsObject()
  data: Record<string, any>;
}

