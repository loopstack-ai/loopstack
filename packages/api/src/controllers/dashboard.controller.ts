import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import {
  DashboardService,
  DashboardStats,
} from '../services/dashboard.service';
import { CurrentUser, CurrentUserInterface } from '@loopstack/shared';
import { DashboardStatsDto } from '../dtos/dashboard.dto';

@ApiTags('api/v1/dashboard')
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  /**
   * Retrieves aggregated statistics for all automations across all workspaces.
   * This includes total counts of workspaces, pipelines, workflows,
   * as well as recent errors and runs.
   * */
  @Get()
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Retrieves aggregated statistics for all automations across all workspaces',
  })
  @ApiOkResponse({
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto,
  })
  async getDashboardStats(
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<DashboardStats> {
    return this.dashboardService.getDashboardStats(user?.userId);
  }
}
