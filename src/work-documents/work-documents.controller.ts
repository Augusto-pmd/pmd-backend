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
  UseInterceptors,
  UploadedFile,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WorkDocumentFileTypeValidator } from './validators/file-type.validator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { WorkDocumentsService } from './work-documents.service';
import { CreateWorkDocumentDto } from './dto/create-work-document.dto';
import { UpdateWorkDocumentDto } from './dto/update-work-document.dto';

@ApiTags('Work Documents')
@ApiBearerAuth('JWT-auth')
@Controller('work-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkDocumentsController {
  constructor(private readonly workDocumentsService: WorkDocumentsService) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Create work document', description: 'Create a new work document. Operators, Administration, and Direction can create documents. Supervisors can only read documents.' })
  @ApiBody({ type: CreateWorkDocumentDto })
  @ApiResponse({ status: 201, description: 'Work document created successfully' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  create(@Body() createDto: CreateWorkDocumentDto, @Request() req) {
    return this.workDocumentsService.create(createDto, req.user);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get all work documents' })
  @ApiQuery({ name: 'work_id', required: false, description: 'Filter by work ID' })
  @ApiResponse({ status: 200, description: 'List of work documents' })
  findAll(@Query('work_id') workId: string, @Request() req) {
    return this.workDocumentsService.findAll(workId, req.user);
  }

  @Get('works/:workId/documents')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get documents for a specific work' })
  @ApiParam({ name: 'workId', description: 'Work UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of work documents' })
  findByWork(@Param('workId') workId: string, @Request() req) {
    return this.workDocumentsService.findAll(workId, req.user);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get work document by ID' })
  @ApiParam({ name: 'id', description: 'Work document UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Work document details' })
  @ApiResponse({ status: 404, description: 'Work document not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.workDocumentsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Update work document', description: 'Update a work document. Only Administration and Direction can update documents. Supervisors can only read documents.' })
  @ApiParam({ name: 'id', description: 'Work document UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateWorkDocumentDto })
  @ApiResponse({ status: 200, description: 'Work document updated successfully' })
  update(@Param('id') id: string, @Body() updateDto: UpdateWorkDocumentDto, @Request() req) {
    return this.workDocumentsService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({ 
    summary: 'Delete work document',
    description: 'Delete work document. Only Direction can delete work documents.',
  })
  @ApiParam({ name: 'id', description: 'Work document UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Work document deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.workDocumentsService.remove(id, req.user);
  }

  @Post('upload')
  @Roles(UserRole.OPERATOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload file for work document',
    description: 'Upload a file and get its URL. The file will be stored in cloud storage (Google Drive/Dropbox) or locally.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        work_id: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully', schema: { type: 'object', properties: { file_url: { type: 'string' } } } })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new WorkDocumentFileTypeValidator({ fileType: /(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|dwg|dxf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('work_id') workId: string,
    @Body('name') documentName?: string,
    @Request() req?: any,
  ) {
    const result = await this.workDocumentsService.uploadFile(file, workId, documentName);
    return result;
  }

  @Get(':id/download')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ 
    summary: 'Download work document file',
    description: 'Download the file associated with a work document.',
  })
  @ApiParam({ name: 'id', description: 'Work document UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    try {
      const result = await this.workDocumentsService.downloadFile(id, req.user);
      
      // Si es una redirección a cloud storage
      if ('redirectUrl' in result) {
        return res.redirect(result.redirectUrl);
      }
      
      // Si es un archivo local
      if ('stream' in result && 'fileName' in result) {
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        result.stream.pipe(res);
      }
    } catch (error) {
      // Si el error es NotFoundException, retornar 404 con mensaje descriptivo
      if (error instanceof NotFoundException) {
        return res.status(404).json({
          statusCode: 404,
          message: error.message,
          error: 'Not Found',
        });
      }
      throw error;
    }
  }
}

