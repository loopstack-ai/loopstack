import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { WorkflowDto } from './workflow.dto';

export class DashboardStatsDto {
  @Expose()
  @ApiProperty({
    description: 'Total number of workspaces',
    example: 3,
  })
  workspaceCount: number;

  @Expose()
  @ApiProperty({
    description: 'Total number of automations',
    example: 15,
  })
  totalAutomations: number;

  @Expose()
  @ApiProperty({
    description: 'Total number of automation runs',
    example: 142,
  })
  totalAutomationRuns: number;

  @Expose()
  @ApiProperty({
    description: 'Number of completed runs',
    example: 95,
  })
  completedRuns: number;

  @Expose()
  @ApiProperty({
    description: 'Number of runs with errors',
    example: 12,
  })
  errorRuns: number;

  @Expose()
  @ApiProperty({
    description: 'Number of runs currently in progress',
    example: 8,
  })
  inProgressRuns: number;

  @Expose()
  @Type(() => WorkflowDto)
  @ApiProperty({
    description: 'List of recent workflow errors',
    type: WorkflowDto,
    isArray: true,
  })
  recentErrors: WorkflowDto[];

  @Expose()
  @Type(() => WorkflowDto)
  @ApiProperty({
    description: 'List of recent workflow runs',
    type: WorkflowDto,
    isArray: true,
  })
  recentRuns: WorkflowDto[];
}
