import { Controller, Get } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface, assertResponse } from '@loopstack/common';
import { DashboardStatsInterface, DashboardStatsSchema } from '@loopstack/contracts/api';
import { toWorkflowItem } from '../mappers/workflow.mapper.js';
import { DashboardService } from '../services/dashboard.service.js';

@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  /**
   * Retrieves aggregated statistics for all automations across all workspaces.
   * This includes total counts of workspaces, workflows,
   * as well as recent errors and runs.
   * */
  @Get()
  async getDashboardStats(@CurrentUser() user: CurrentUserInterface): Promise<DashboardStatsInterface> {
    const stats = await this.dashboardService.getDashboardStats(user.userId);
    return assertResponse(DashboardStatsSchema, {
      totalAutomationRuns: stats.totalAutomationRuns,
      completedRuns: stats.completedRuns,
      errorRuns: stats.errorRuns,
      inProgressRuns: stats.inProgressRuns,
      recentErrors: stats.recentErrors.map(toWorkflowItem),
      recentRuns: stats.recentRuns.map(toWorkflowItem),
    });
  }
}
