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
import { ValService } from './val.service';
import { CreateValDto } from './dto/create-val.dto';
import { UpdateValDto } from './dto/update-val.dto';

@Controller('val')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ValController {
  constructor(private readonly valService: ValService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  create(@Body() createDto: CreateValDto, @Request() req) {
    return this.valService.create(createDto, req.user);
  }

  @Get()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  findAll(@Request() req) {
    return this.valService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  findOne(@Param('id') id: string, @Request() req) {
    return this.valService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  update(@Param('id') id: string, @Body() updateDto: UpdateValDto, @Request() req) {
    return this.valService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  remove(@Param('id') id: string, @Request() req) {
    return this.valService.remove(id, req.user);
  }
}

