import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser, CurrentUserInterface, RoleName, Roles } from '@loopstack/common';
import { AdminUserAssignRolesDto } from '../dtos/admin-user-assign-roles.dto.js';
import { AdminUserFilterDto } from '../dtos/admin-user-filter.dto.js';
import { AdminUserItemDto } from '../dtos/admin-user-item.dto.js';
import { AdminUserSortByDto } from '../dtos/admin-user-sort-by.dto.js';
import { AdminUserUpdateStatusDto } from '../dtos/admin-user-update-status.dto.js';
import { AdminUserDto } from '../dtos/admin-user.dto.js';
import { PaginatedDto } from '../dtos/paginated.dto.js';
import { ParseJsonPipe } from '../pipes/parse-json.pipe.js';
import { AdminUserApiService } from '../services/admin-user-api.service.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Roles(RoleName.ADMIN)
@Controller('api/v1/admin/users')
export class AdminUserController {
  constructor(private readonly adminUserApiService: AdminUserApiService) {}

  @Get()
  async getUsers(
    @Query('filter', new ParseJsonPipe(AdminUserFilterDto)) filter: AdminUserFilterDto,
    @Query('sortBy', new ParseJsonPipe(AdminUserSortByDto)) sortBy: AdminUserSortByDto[],
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedDto<AdminUserItemDto>> {
    const result = await this.adminUserApiService.findAll(filter, sortBy, { page, limit });
    return PaginatedDto.create(AdminUserItemDto, result);
  }

  @Get(':id')
  async getUserById(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminUserDto> {
    const user = await this.adminUserApiService.findOneById(id);
    return AdminUserDto.create(user);
  }

  @Patch(':id/status')
  async updateUserStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminUserUpdateStatusDto,
    @CurrentUser() currentUser: CurrentUserInterface,
  ): Promise<AdminUserDto> {
    const user = await this.adminUserApiService.updateStatus(id, dto.isActive, currentUser.userId);
    return AdminUserDto.create(user);
  }

  @Post(':id/roles')
  async assignRoles(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminUserAssignRolesDto,
  ): Promise<AdminUserDto> {
    const user = await this.adminUserApiService.assignRoles(id, dto.roleIds);
    return AdminUserDto.create(user);
  }

  @Delete(':id/roles/:roleId')
  async removeRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
  ): Promise<AdminUserDto> {
    const user = await this.adminUserApiService.removeRole(id, roleId);
    return AdminUserDto.create(user);
  }
}
