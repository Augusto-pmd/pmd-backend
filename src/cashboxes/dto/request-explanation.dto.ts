import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestExplanationDto {
  @ApiProperty({
    description: 'Request message or question about the difference',
    example: 'Por favor, explica la diferencia de $500 ARS en el cierre de caja',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}

