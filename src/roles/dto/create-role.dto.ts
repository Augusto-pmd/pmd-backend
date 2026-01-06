import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name',
    enum: UserRole,
    example: UserRole.DIRECTION,
  })
  @IsEnum(UserRole)
  name: UserRole;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Full access to all system features',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Role permissions (JSON object)',
    example: { 'users:read': true, 'users:write': true },
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;
}

