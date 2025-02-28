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
import { WorkflowApiService } from '../services/workflow-api.service';
import { WorkflowQueryDto } from '../dtos/workflow-query-dto';
import { PaginatedDto } from "../dtos/paginated.dto";
import { ApiPaginatedResponse } from "../decorators/api-paginated-response.decorator";
import { WorkflowDto } from "../dtos/workflow.dto";
import {WorkflowItemDto} from "../dtos/workflow-item.dto";

@ApiTags('api/v1/workflows')
@ApiExtraModels(WorkflowDto, WorkflowItemDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/workflows')
export class WorkflowController {
    constructor(private readonly workflowService: WorkflowApiService) {}

    /**
     * Retrieves all workflows for the authenticated user with optional filters, sorting, and pagination.
     */
    @Post('/list')
    @ApiOperation({
        summary: 'Retrieve workflows with filters, sorting, and pagination',
    })
    @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
    @ApiPaginatedResponse(WorkflowItemDto)
    async searchWorkflows(@Body() query: WorkflowQueryDto, @Request() req: any): Promise<PaginatedDto<WorkflowItemDto>> {
        const user = req.user || null;
        const result = await this.workflowService.findAll(user, query);
        return PaginatedDto.create(WorkflowItemDto, result);
    }

    /**
     * Retrieves a workflow by its ID.
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get a workflow by ID' })
    @ApiParam({ name: 'id', type: String, description: 'The ID of the workflow' })
    @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
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