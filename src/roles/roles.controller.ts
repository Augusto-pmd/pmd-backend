import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(UserRole.DIRECTION)
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR, UserRole.ADMINISTRATION)
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR, UserRole.ADMINISTRATION)
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Get(':id/permissions')
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR, UserRole.ADMINISTRATION)
  getPermissions(@Param('id') id: string) {
    return this.rolesService.getPermissions(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTION)
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}


