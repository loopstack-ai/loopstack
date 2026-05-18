import { Controller, Get, Param, ParseIntPipe, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { DocumentFilterDto } from '../dtos/document-filter.dto.js';
import { DocumentItemDto } from '../dtos/document-item.dto.js';
import { DocumentSortByDto } from '../dtos/document-sort-by.dto.js';
import { DocumentDto } from '../dtos/document.dto.js';
import { PaginatedDto } from '../dtos/paginated.dto.js';
import { ParseJsonPipe } from '../pipes/parse-json.pipe.js';
import { DocumentApiService } from '../services/document-api.service.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentApiService) {}

  /**
   * Retrieves all documents for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  async getDocuments(
    @CurrentUser() user: CurrentUserInterface,
    @Query('filter', new ParseJsonPipe(DocumentFilterDto)) filter: DocumentFilterDto,
    @Query('sortBy', new ParseJsonPipe(DocumentSortByDto)) sortBy: DocumentSortByDto[],
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
  async getDocumentById(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<DocumentDto> {
    const document = await this.documentService.findOneById(id, user.userId);
    return DocumentDto.create(document);
  }
}
