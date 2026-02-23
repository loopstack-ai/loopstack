import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { RoleName, Roles } from '@loopstack/common';
import {
  AdminSystemApiService,
  SseConnectionInfo,
  SystemHealth,
  SystemStats,
} from '../services/admin-system-api.service';

@ApiTags('api/v1/admin/system')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Roles(RoleName.ADMIN)
@Controller('api/v1/admin/system')
export class AdminSystemController {
  constructor(private readonly adminSystemApiService: AdminSystemApiService) {}

  @Get('health')
  @ApiOperation({
    summary: 'System health check',
    description: 'Requires ADMIN role. Returns system health including DB connectivity, memory usage, and uptime.',
  })
  @ApiOkResponse({ description: 'System health status' })
  @ApiUnauthorizedResponse()
  async getHealth(): Promise<SystemHealth> {
    return this.adminSystemApiService.getHealth();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'System-wide statistics',
    description: 'Requires ADMIN role. Returns aggregate counts for users, workspaces, pipelines, and workflows.',
  })
  @ApiOkResponse({ description: 'System statistics' })
  @ApiUnauthorizedResponse()
  async getStats(): Promise<SystemStats> {
    return this.adminSystemApiService.getStats();
  }

  @Get('connections')
  @ApiOperation({
    summary: 'Active SSE connections',
    description: 'Requires ADMIN role. Returns the list of active SSE connections.',
  })
  @ApiOkResponse({ description: 'Active SSE connection info' })
  @ApiUnauthorizedResponse()
  getConnections(): SseConnectionInfo {
    return this.adminSystemApiService.getConnections();
  }
}
