import {
  Controller,
  Get,
  Param,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  findAll() {
    return this.auditService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }

  @Get('module/:module')
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  findByModule(@Param('module') module: string) {
    return this.auditService.findByModule(module);
  }

  @Get('user/:userId')
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  findByUser(@Param('userId') userId: string) {
    return this.auditService.findByUser(userId);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  remove(@Param('id') id: string) {
    return this.auditService.remove(id);
  }

  @Delete()
  @Roles(UserRole.DIRECTION)
  removeAll() {
    return this.auditService.removeAll();
  }
}


