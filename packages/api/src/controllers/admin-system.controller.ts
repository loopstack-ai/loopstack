import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { RoleName, Roles } from '@loopstack/common';
import {
  AdminSystemApiService,
  SseConnectionInfo,
  SystemHealth,
  SystemStats,
} from '../services/admin-system-api.service.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Roles(RoleName.ADMIN)
@Controller('api/v1/admin/system')
export class AdminSystemController {
  constructor(private readonly adminSystemApiService: AdminSystemApiService) {}

  @Get('health')
  async getHealth(): Promise<SystemHealth> {
    return this.adminSystemApiService.getHealth();
  }

  @Get('stats')
  async getStats(): Promise<SystemStats> {
    return this.adminSystemApiService.getStats();
  }

  @Get('connections')
  getConnections(): SseConnectionInfo {
    return this.adminSystemApiService.getConnections();
  }
}
