import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  Query,
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
import { WorkflowApiService } from '../services/workflow-api.service';
import { WorkflowQueryDto } from '../dtos/workflow-query-dto';
import { PaginatedDto } from '../dtos/paginated.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { WorkflowDto } from '../dtos/workflow.dto';
import { WorkflowItemDto } from '../dtos/workflow-item.dto';
import { WorkflowFilterDto } from '../dtos/workflow-filter.dto';
import { WorkflowSortByDto } from '../dtos/workflow-sort-by.dto';

@ApiTags('api/v1/workflows')
@ApiExtraModels(WorkflowDto, WorkflowItemDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowApiService) {}

  /**
   * Retrieves all workflows for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve workflows with filters, sorting, and pagination',
  })
  @ApiExtraModels(WorkflowFilterDto, WorkflowSortByDto)
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
    description: 'JSON string array of WorkflowSortByDto objects',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    schema: {
      type: 'string',
      example: '{"projectId":"123e4567-e89b-12d3-a456-426614174000"}',
    },
    description: 'JSON string of WorkflowFilterDto object',
  })
  @ApiPaginatedResponse(WorkflowItemDto)
  async getWorkflows(
    @Request() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('filter') filterParam?: string,
    @Query('sortBy') sortByParam?: string,
  ): Promise<PaginatedDto<WorkflowItemDto>> {
    const user = req.user || null;

    let filter: WorkflowFilterDto = {};
    if (filterParam) {
      try {
        filter = JSON.parse(filterParam) as WorkflowFilterDto;
      } catch (e) {
        throw new BadRequestException('Invalid filter format');
      }
    }

    let sortBy: WorkflowSortByDto[] = [];
    if (sortByParam) {
      try {
        sortBy = JSON.parse(sortByParam) as WorkflowSortByDto[];
      } catch (e) {
        throw new BadRequestException('Invalid sortBy format');
      }
    }

    const result = await this.workflowService.findAll(user, filter, sortBy, {
      page,
      limit,
    });
    return PaginatedDto.create(WorkflowItemDto, result);
  }

  /**
   * Retrieves a workflow by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the workflow' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiOkResponse({ type: WorkflowDto })
  async getWorkflowById(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<WorkflowDto> {
    const user = req.user || null;
    const workflow = await this.workflowService.findOneById(id, user);
    return WorkflowDto.create(workflow);
  }
}
