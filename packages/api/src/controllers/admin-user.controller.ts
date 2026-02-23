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
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, CurrentUserInterface, RoleName, Roles } from '@loopstack/common';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { AdminUserAssignRolesDto } from '../dtos/admin-user-assign-roles.dto';
import { AdminUserFilterDto } from '../dtos/admin-user-filter.dto';
import { AdminUserItemDto } from '../dtos/admin-user-item.dto';
import { AdminUserSortByDto } from '../dtos/admin-user-sort-by.dto';
import { AdminUserUpdateStatusDto } from '../dtos/admin-user-update-status.dto';
import { AdminUserDto } from '../dtos/admin-user.dto';
import { PaginatedDto } from '../dtos/paginated.dto';
import { ParseJsonPipe } from '../pipes/parse-json.pipe';
import { AdminUserApiService } from '../services/admin-user-api.service';

@ApiTags('api/v1/admin/users')
@ApiExtraModels(AdminUserDto, AdminUserItemDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Roles(RoleName.ADMIN)
@Controller('api/v1/admin/users')
export class AdminUserController {
  constructor(private readonly adminUserApiService: AdminUserApiService) {}

  @Get()
  @ApiOperation({
    summary: 'List all users with filters, sorting, and pagination',
    description: 'Requires ADMIN role. Returns all users across the system.',
  })
  @ApiExtraModels(AdminUserFilterDto, AdminUserSortByDto)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    schema: {
      type: 'string',
      example: '[{"field":"createdAt","order":"DESC"}]',
    },
    description: 'JSON string array of AdminUserSortByDto objects',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    schema: {
      type: 'string',
      example: '{"isActive":true}',
    },
    description: 'JSON string of AdminUserFilterDto object',
  })
  @ApiPaginatedResponse(AdminUserItemDto)
  @ApiUnauthorizedResponse()
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
  @ApiOperation({
    summary: 'Get a user by ID',
    description: 'Requires ADMIN role. Returns user details including roles and permissions.',
  })
  @ApiParam({ name: 'id', type: String, description: 'The UUID of the user' })
  @ApiOkResponse({ type: AdminUserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiUnauthorizedResponse()
  async getUserById(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminUserDto> {
    const user = await this.adminUserApiService.findOneById(id);
    return AdminUserDto.create(user);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or deactivate a user',
    description: 'Requires ADMIN role. Cannot deactivate yourself.',
  })
  @ApiParam({ name: 'id', type: String, description: 'The UUID of the user' })
  @ApiBody({ type: AdminUserUpdateStatusDto })
  @ApiOkResponse({ type: AdminUserDto })
  @ApiResponse({ status: 400, description: 'Cannot change your own active status' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiUnauthorizedResponse()
  async updateUserStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminUserUpdateStatusDto,
    @CurrentUser() currentUser: CurrentUserInterface,
  ): Promise<AdminUserDto> {
    const user = await this.adminUserApiService.updateStatus(id, dto.isActive, currentUser.userId);
    return AdminUserDto.create(user);
  }

  @Post(':id/roles')
  @ApiOperation({
    summary: 'Assign roles to a user',
    description: 'Requires ADMIN role. Replaces all existing role assignments.',
  })
  @ApiParam({ name: 'id', type: String, description: 'The UUID of the user' })
  @ApiBody({ type: AdminUserAssignRolesDto })
  @ApiOkResponse({ type: AdminUserDto })
  @ApiResponse({ status: 400, description: 'One or more roles not found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiUnauthorizedResponse()
  async assignRoles(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminUserAssignRolesDto,
  ): Promise<AdminUserDto> {
    const user = await this.adminUserApiService.assignRoles(id, dto.roleIds);
    return AdminUserDto.create(user);
  }

  @Delete(':id/roles/:roleId')
  @ApiOperation({
    summary: 'Remove a role from a user',
    description: 'Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', type: String, description: 'The UUID of the user' })
  @ApiParam({ name: 'roleId', type: String, description: 'The UUID of the role to remove' })
  @ApiOkResponse({ type: AdminUserDto })
  @ApiResponse({ status: 404, description: 'User or role assignment not found' })
  @ApiUnauthorizedResponse()
  async removeRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
  ): Promise<AdminUserDto> {
    const user = await this.adminUserApiService.removeRole(id, roleId);
    return AdminUserDto.create(user);
  }
}
