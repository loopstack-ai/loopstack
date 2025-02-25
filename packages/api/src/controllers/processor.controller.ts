import { Body, Controller, Param, Post, Query, Request } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { ProjectEntity } from '@loopstack/core/dist/persistence/entities/project.entity';
import { ProcessorApiService } from '../services/processor-api.service';

@ApiTags('api/v1/processor')
@Controller('api/v1/processor')
export class ProcessorController {
  constructor(private processorApiService: ProcessorApiService) {}

  @Post('run/:projectId')
  @ApiOperation({ summary: 'Run a project' })
  @ApiParam({
    name: 'projectId',
    type: String,
    description: 'The ID of the project',
  })
  @ApiQuery({
    name: 'force',
    type: Boolean,
    required: false,
    description: 'Force run the project',
  })
  @ApiBody({ type: Object, description: 'Run Payload' })
  async runProject(
    @Param('projectId') projectId: string,
    @Body() payload: any,
    @Request() req: ApiRequestType,
    @Query('force') force?: boolean,
  ): Promise<ProjectEntity> {
    const user = req.user || null;
    return this.processorApiService.processProject(projectId, user, payload, {
      force: !!force,
    });
  }
}
