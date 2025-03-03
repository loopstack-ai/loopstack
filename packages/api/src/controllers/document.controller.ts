import {
  Controller,
  Get,
  Param,
  Request,
  UsePipes,
  ValidationPipe,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { DocumentApiService } from '../services/document-api.service';
import { PaginatedDto } from '../dtos/paginated.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { DocumentDto } from '../dtos/document.dto';
import { DocumentItemDto } from '../dtos/document-item.dto';
import { DocumentFilterDto } from '../dtos/document-filter.dto';
import { DocumentSortByDto } from '../dtos/document-sort-by.dto';

@ApiTags('api/v1/documents')
@ApiExtraModels(DocumentDto, DocumentItemDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentApiService) {}

  /**
   * Retrieves all documents for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve documents with filters, sorting, and pagination',
  })
  @ApiExtraModels(DocumentFilterDto, DocumentSortByDto)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    schema: {
      type: 'string',
      example: '[{"field":"createdAt","order":"DESC"}]',
    },
    description: 'JSON string array of DocumentSortByDto objects',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    schema: {
      type: 'string',
      example: '{"workflowId":"123e4567-e89b-12d3-a456-426614174000"}',
    },
    description: 'JSON string of DocumentFilterDto object',
  })
  @ApiPaginatedResponse(DocumentItemDto)
  async getDocuments(
    @Request() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('filter') filterParam?: string,
    @Query('sortBy') sortByParam?: string,
  ): Promise<PaginatedDto<DocumentItemDto>> {
    const user = req.user || null;

    let filter: DocumentFilterDto = {};
    if (filterParam) {
      try {
        filter = JSON.parse(filterParam) as DocumentFilterDto;
      } catch (e) {
        throw new BadRequestException('Invalid filter format');
      }
    }

    let sortBy: DocumentSortByDto[] = [];
    if (sortByParam) {
      try {
        sortBy = JSON.parse(sortByParam) as DocumentSortByDto[];
      } catch (e) {
        throw new BadRequestException('Invalid sortBy format');
      }
    }

    const result = await this.documentService.findAll(user, filter, sortBy, {
      page,
      limit,
    });
    return PaginatedDto.create(DocumentItemDto, result);
  }

  /**
   * Retrieves a document by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the document' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiOkResponse({ type: DocumentDto })
  async getDocumentById(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<DocumentDto> {
    const user = req.user || null;
    const document = await this.documentService.findOneById(id, user);
    return DocumentDto.create(document);
  }
}
