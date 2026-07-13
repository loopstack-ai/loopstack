import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface, ZodJsonQueryPipe } from '@loopstack/common';
import {
  DocumentFilterInterface,
  DocumentFilterSchema,
  DocumentItemInterface,
  DocumentSortByInterface,
  PaginatedInterface,
} from '@loopstack/contracts/api';
import { toDocumentItem } from '../mappers/document.mapper.js';
import { toPaginated } from '../mappers/paginated.util.js';
import { DocumentSortByQuerySchema } from '../schemas/sort-by.schemas.js';
import { DocumentApiService } from '../services/document-api.service.js';

@Controller('api/v1/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentApiService) {}

  /**
   * Retrieves all documents for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  async getDocuments(
    @CurrentUser() user: CurrentUserInterface,
    @Query('filter', new ZodJsonQueryPipe(DocumentFilterSchema)) filter: DocumentFilterInterface | undefined,
    @Query('sortBy', new ZodJsonQueryPipe(DocumentSortByQuerySchema)) sortBy: DocumentSortByInterface[] | undefined,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedInterface<DocumentItemInterface>> {
    const result = await this.documentService.findAll(user.userId, filter, sortBy, {
      page,
      limit,
    });
    return toPaginated(result, toDocumentItem);
  }

  /**
   * Retrieves a document by its ID.
   */
  @Get(':id')
  async getDocumentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<DocumentItemInterface> {
    const document = await this.documentService.findOneById(id, user.userId);
    return toDocumentItem(document);
  }
}
