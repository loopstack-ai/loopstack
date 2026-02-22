import { Controller, Get, Param, ParseIntPipe, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { DocumentFilterDto } from '../dtos/document-filter.dto';
import { DocumentItemDto } from '../dtos/document-item.dto';
import { DocumentSortByDto } from '../dtos/document-sort-by.dto';
import { DocumentDto } from '../dtos/document.dto';
import { PaginatedDto } from '../dtos/paginated.dto';
import { ParseFilterPipe } from '../pipes/parse-filter.pipe';
import { ParseSortByPipe } from '../pipes/parse-sort-by.pipe';
import { DocumentApiService } from '../services/document-api.service';

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
  @ApiUnauthorizedResponse()
  async getDocuments(
    @CurrentUser() user: CurrentUserInterface,
    @Query('filter', new ParseFilterPipe(DocumentFilterDto)) filter: DocumentFilterDto,
    @Query('sortBy', new ParseSortByPipe(DocumentSortByDto)) sortBy: DocumentSortByDto[],
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedDto<DocumentItemDto>> {
    const result = await this.documentService.findAll(user.userId, filter, sortBy, {
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
  @ApiUnauthorizedResponse()
  async getDocumentById(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<DocumentDto> {
    const document = await this.documentService.findOneById(id, user.userId);
    return DocumentDto.create(document);
  }
}
