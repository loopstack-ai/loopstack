import {
  Controller,
  Get,
  Param,
  Request,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  Query,
  BadRequestException, Delete, UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { WorkflowApiService } from '../services/workflow-api.service';
import { PaginatedDto } from '../dtos/paginated.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { WorkflowDto } from '../dtos/workflow.dto';
import { WorkflowItemDto } from '../dtos/workflow-item.dto';
import { WorkflowFilterDto } from '../dtos/workflow-filter.dto';
import { WorkflowSortByDto } from '../dtos/workflow-sort-by.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

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
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  async getWorkflows(
    @Request() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('filter') filterParam?: string,
    @Query('sortBy') sortByParam?: string,
  ): Promise<PaginatedDto<WorkflowItemDto>> {
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

    const result = await this.workflowService.findAll(req.user.id, filter, sortBy, {
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
  @UseGuards(JwtAuthGuard)
  async getWorkflowById(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<WorkflowDto> {
    const workflow = await this.workflowService.findOneById(id, req.user.id);
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
  @UseGuards(JwtAuthGuard)
  async deleteWorkflow(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<void> {
    await this.workflowService.delete(id, req.user.id);
  }
}
