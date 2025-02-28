import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Request, UsePipes, ValidationPipe,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
    ApiExtraModels, ApiOkResponse,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { DocumentApiService } from '../services/document-api.service';
import { DocumentQueryDto } from '../dtos/document-query-dto';
import { PaginatedDto } from "../dtos/paginated.dto";
import { ApiPaginatedResponse } from "../decorators/api-paginated-response.decorator";
import { DocumentDto } from "../dtos/document.dto";
import {DocumentItemDto} from "../dtos/document-item.dto";

@ApiTags('api/v1/documents')
@ApiExtraModels(DocumentDto, DocumentItemDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/documents')
export class DocumentController {
    constructor(private readonly documentService: DocumentApiService) {}

    /**
     * Retrieves all documents for the authenticated user with optional filters, sorting, and pagination.
     */
    @Post('/list')
    @ApiOperation({
        summary: 'Retrieve documents with filters, sorting, and pagination',
    })
    @ApiPaginatedResponse(DocumentItemDto)
    async searchDocuments(@Body() query: DocumentQueryDto, @Request() req: any): Promise<PaginatedDto<DocumentItemDto>> {
        const user = req.user || null;
        const result = await this.documentService.findAll(user, query);
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