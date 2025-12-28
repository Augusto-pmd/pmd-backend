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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('Schedule')
@ApiBearerAuth('JWT-auth')
@Controller('schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @Roles(UserRole.DIRECTION)
  create(@Body() createDto: CreateScheduleDto, @Request() req) {
    return this.scheduleService.create(createDto, req.user);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  findAll(@Request() req) {
    return this.scheduleService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  findOne(@Param('id') id: string, @Request() req) {
    return this.scheduleService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  update(@Param('id') id: string, @Body() updateDto: UpdateScheduleDto, @Request() req) {
    return this.scheduleService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  remove(@Param('id') id: string, @Request() req) {
    return this.scheduleService.remove(id, req.user);
  }

  @Post('generate/:workId')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({ summary: 'Generate automatic Gantt chart for a work' })
  @ApiResponse({ status: 201, description: 'Gantt chart generated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  generateGantt(@Param('workId') workId: string, @Request() req) {
    return this.scheduleService.generateAutomaticGantt(workId, req.user);
  }

  @Post('regenerate/:workId')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({ summary: 'Regenerate Gantt chart for a work (deletes existing and creates new)' })
  @ApiResponse({ status: 201, description: 'Gantt chart regenerated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  regenerateGantt(@Param('workId') workId: string, @Request() req) {
    return this.scheduleService.regenerateGantt(workId, req.user);
  }

  @Get('work/:workId')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get all schedules for a work' })
  @ApiResponse({ status: 200, description: 'Schedules retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  findByWorkId(@Param('workId') workId: string, @Request() req) {
    return this.scheduleService.findByWorkId(workId, req.user);
  }
}

