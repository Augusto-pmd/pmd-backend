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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RubricsService } from './rubrics.service';
import { CreateRubricDto } from './dto/create-rubric.dto';
import { UpdateRubricDto } from './dto/update-rubric.dto';

@ApiTags('Rubrics')
@ApiBearerAuth('JWT-auth')
@Controller('rubrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RubricsController {
  constructor(private readonly rubricsService: RubricsService) {}

  @Post()
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  @ApiOperation({
    summary: 'Create rubric',
    description: 'Create a new rubric/category. Only Direction and Administration can create rubrics.',
  })
  @ApiBody({ type: CreateRubricDto })
  @ApiResponse({ status: 201, description: 'Rubric created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(@Body() createRubricDto: CreateRubricDto) {
    return this.rubricsService.create(createRubricDto);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION, UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Get all rubrics',
    description: 'Retrieve all active rubrics/categories. All roles can view rubrics.',
  })
  @ApiResponse({ status: 200, description: 'List of rubrics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.rubricsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION, UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Get rubric by ID',
    description: 'Retrieve a specific rubric by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Rubric UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Rubric details' })
  @ApiResponse({ status: 404, description: 'Rubric not found' })
  findOne(@Param('id') id: string) {
    return this.rubricsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION)
  @ApiOperation({
    summary: 'Update rubric',
    description: 'Update a rubric. Only Direction and Administration can update rubrics.',
  })
  @ApiParam({ name: 'id', description: 'Rubric UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateRubricDto })
  @ApiResponse({ status: 200, description: 'Rubric updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Rubric not found' })
  update(@Param('id') id: string, @Body() updateRubricDto: UpdateRubricDto) {
    return this.rubricsService.update(id, updateRubricDto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete rubric',
    description: 'Delete a rubric. Only Direction can delete rubrics. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Rubric UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Rubric deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete rubrics' })
  @ApiResponse({ status: 404, description: 'Rubric not found' })
  remove(@Param('id') id: string) {
    return this.rubricsService.remove(id);
  }
}


