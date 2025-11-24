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
import { RubricsService } from './rubrics.service';
import { CreateRubricDto } from './dto/create-rubric.dto';
import { UpdateRubricDto } from './dto/update-rubric.dto';

@Controller('rubrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RubricsController {
  constructor(private readonly rubricsService: RubricsService) {}

  @Post()
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  create(@Body() createRubricDto: CreateRubricDto) {
    return this.rubricsService.create(createRubricDto);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION, UserRole.OPERATOR)
  findAll() {
    return this.rubricsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION, UserRole.OPERATOR)
  findOne(@Param('id') id: string) {
    return this.rubricsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  update(@Param('id') id: string, @Body() updateRubricDto: UpdateRubricDto) {
    return this.rubricsService.update(id, updateRubricDto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  remove(@Param('id') id: string) {
    return this.rubricsService.remove(id);
  }
}


