import { Expose, Type } from 'class-transformer';
import { WorkflowDto } from './workflow.dto.js';

export class DashboardStatsDto {
  @Expose()
  workspaceCount: number;

  @Expose()
  totalAutomations: number;

  @Expose()
  totalAutomationRuns: number;

  @Expose()
  completedRuns: number;

  @Expose()
  errorRuns: number;

  @Expose()
  inProgressRuns: number;

  @Expose()
  @Type(() => WorkflowDto)
  recentErrors: WorkflowDto[];

  @Expose()
  @Type(() => WorkflowDto)
  recentRuns: WorkflowDto[];
}
