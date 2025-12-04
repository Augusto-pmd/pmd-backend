import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.DIRECTION)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR, UserRole.ADMINISTRATION)
  findAll(@Request() req) {
    return this.usersService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR, UserRole.ADMINISTRATION)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTION)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  @Roles(UserRole.DIRECTION)
  updateRole(@Param('id') id: string, @Body() body: { role_id: string }) {
    return this.usersService.updateRole(id, body.role_id);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}


