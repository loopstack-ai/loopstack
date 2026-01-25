import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
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
import { NamespaceFilterDto } from '../dtos/namespace-filter.dto';
import { NamespaceItemDto } from '../dtos/namespace-item.dto';
import { NamespaceSortByDto } from '../dtos/namespace-sort-by.dto';
import { NamespaceDto } from '../dtos/namespace.dto';
import { PaginatedDto } from '../dtos/paginated.dto';
import { NamespaceApiService } from '../services/namespace-api.service';

@ApiTags('api/v1/namespaces')
@ApiExtraModels(NamespaceDto, NamespaceItemDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/namespaces')
export class NamespaceController {
  constructor(private readonly namespaceApiService: NamespaceApiService) {}

  /**
   * Retrieves all namespaces for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve namespaces with filters, sorting, and pagination',
  })
  @ApiExtraModels(NamespaceFilterDto, NamespaceSortByDto)
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
    description: 'JSON string array of NamespaceSortByDto objects',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    schema: {
      type: 'string',
      example: '{"workspaceId":"123e4567-e89b-12d3-a456-426614174000"}',
    },
    description: 'JSON string of NamespaceFilterDto object',
  })
  @ApiPaginatedResponse(NamespaceItemDto)
  @ApiUnauthorizedResponse()
  async getWorkflows(
    @CurrentUser() user: CurrentUserInterface,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('filter') filterParam?: string,
    @Query('sortBy') sortByParam?: string,
  ): Promise<PaginatedDto<NamespaceItemDto>> {
    let filter: NamespaceFilterDto = {};
    if (filterParam) {
      try {
        filter = JSON.parse(filterParam) as NamespaceFilterDto;
      } catch {
        throw new BadRequestException('Invalid filter format');
      }
    }

    let sortBy: NamespaceSortByDto[] = [];
    if (sortByParam) {
      try {
        sortBy = JSON.parse(sortByParam) as NamespaceSortByDto[];
      } catch {
        throw new BadRequestException('Invalid sortBy format');
      }
    }

    const result = await this.namespaceApiService.findAll(user.userId, filter, sortBy, {
      page,
      limit,
    });
    return PaginatedDto.create(NamespaceItemDto, result);
  }

  /**
   * Retrieves a namespace by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a namespace by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'The ID of the namespace',
  })
  @ApiResponse({ status: 404, description: 'Namespace not found' })
  @ApiOkResponse({ type: NamespaceDto })
  @ApiUnauthorizedResponse()
  async getWorkflowById(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<NamespaceDto> {
    const workflow = await this.namespaceApiService.findOneById(id, user.userId);
    return NamespaceDto.create(workflow);
  }
}
