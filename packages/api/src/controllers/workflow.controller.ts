import {
  BadRequestException,
  Controller,
  Delete,
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
import { PaginatedDto } from '../dtos/paginated.dto';
import { WorkflowFilterDto } from '../dtos/workflow-filter.dto';
import { WorkflowItemDto } from '../dtos/workflow-item.dto';
import { WorkflowSortByDto } from '../dtos/workflow-sort-by.dto';
import { WorkflowDto } from '../dtos/workflow.dto';
import { WorkflowApiService } from '../services/workflow-api.service';

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
      example: '{"pipelineId":"123e4567-e89b-12d3-a456-426614174000"}',
    },
    description: 'JSON string of WorkflowFilterDto object',
  })
  @ApiPaginatedResponse(WorkflowItemDto)
  @ApiUnauthorizedResponse()
  async getWorkflows(
    @CurrentUser() user: CurrentUserInterface,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('filter') filterParam?: string,
    @Query('sortBy') sortByParam?: string,
  ): Promise<PaginatedDto<WorkflowItemDto>> {
    let filter: WorkflowFilterDto = {};
    if (filterParam) {
      try {
        filter = JSON.parse(filterParam) as WorkflowFilterDto;
      } catch {
        throw new BadRequestException('Invalid filter format');
      }
    }

    let sortBy: WorkflowSortByDto[] = [];
    if (sortByParam) {
      try {
        sortBy = JSON.parse(sortByParam) as WorkflowSortByDto[];
      } catch {
        throw new BadRequestException('Invalid sortBy format');
      }
    }

    const result = await this.workflowService.findAll(user.userId, filter, sortBy, {
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
  @ApiUnauthorizedResponse()
  async getWorkflowById(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<WorkflowDto> {
    const workflow = await this.workflowService.findOneById(id, user.userId);
    return WorkflowDto.create(workflow);
  }

  /**
   * Deletes a workflow by its ID.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workflow by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiUnauthorizedResponse()
  async deleteWorkflow(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<void> {
    await this.workflowService.delete(id, user.userId);
  }
}
