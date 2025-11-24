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
import { WorksService } from './works.service';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';

@Controller('works')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  @Post()
  @Roles(UserRole.DIRECTION)
  create(@Body() createWorkDto: CreateWorkDto, @Request() req) {
    return this.worksService.create(createWorkDto, req.user);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  findAll(@Request() req) {
    return this.worksService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION, UserRole.OPERATOR)
  findOne(@Param('id') id: string, @Request() req) {
    return this.worksService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR)
  update(@Param('id') id: string, @Body() updateWorkDto: UpdateWorkDto, @Request() req) {
    return this.worksService.update(id, updateWorkDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  remove(@Param('id') id: string, @Request() req) {
    return this.worksService.remove(id, req.user);
  }
}


