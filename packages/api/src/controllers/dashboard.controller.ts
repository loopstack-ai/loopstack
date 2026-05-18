import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { DashboardService, DashboardStats } from '../services/dashboard.service';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  /**
   * Retrieves aggregated statistics for all automations across all workspaces.
   * This includes total counts of workspaces, workflows,
   * as well as recent errors and runs.
   * */
  @Get()
  async getDashboardStats(@CurrentUser() user: CurrentUserInterface): Promise<DashboardStats> {
    return this.dashboardService.getDashboardStats(user.userId);
  }
}
