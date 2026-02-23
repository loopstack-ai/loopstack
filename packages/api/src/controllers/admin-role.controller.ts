import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RoleName, Roles } from '@loopstack/common';
import { AdminRoleCreateDto } from '../dtos/admin-role-create.dto';
import { AdminRoleItemDto } from '../dtos/admin-role-item.dto';
import { AdminRoleUpdateDto } from '../dtos/admin-role-update.dto';
import { AdminRoleDto } from '../dtos/admin-role.dto';
import { AdminRoleApiService } from '../services/admin-role-api.service';

@ApiTags('api/v1/admin/roles')
@ApiExtraModels(AdminRoleDto, AdminRoleItemDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Roles(RoleName.ADMIN)
@Controller('api/v1/admin/roles')
export class AdminRoleController {
  constructor(private readonly adminRoleApiService: AdminRoleApiService) {}

  @Get()
  @ApiOperation({
    summary: 'List all roles',
    description: 'Requires ADMIN role. Returns all roles with user counts.',
  })
  @ApiOkResponse({ type: [AdminRoleItemDto] })
  @ApiUnauthorizedResponse()
  async getRoles(): Promise<AdminRoleItemDto[]> {
    const roles = await this.adminRoleApiService.findAll();
    return roles.map((role) => AdminRoleItemDto.create(role));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a role by ID',
    description: 'Requires ADMIN role. Returns role details including user count.',
  })
  @ApiParam({ name: 'id', type: String, description: 'The UUID of the role' })
  @ApiOkResponse({ type: AdminRoleDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiUnauthorizedResponse()
  async getRoleById(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminRoleDto> {
    const role = await this.adminRoleApiService.findOneById(id);
    return AdminRoleDto.create(role);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new role',
    description: 'Requires ADMIN role.',
  })
  @ApiBody({ type: AdminRoleCreateDto })
  @ApiOkResponse({ type: AdminRoleDto })
  @ApiResponse({ status: 400, description: 'Role name already exists' })
  @ApiUnauthorizedResponse()
  async createRole(@Body() dto: AdminRoleCreateDto): Promise<AdminRoleDto> {
    const role = await this.adminRoleApiService.create(dto);
    return AdminRoleDto.create(role);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a role',
    description: 'Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', type: String, description: 'The UUID of the role' })
  @ApiBody({ type: AdminRoleUpdateDto })
  @ApiOkResponse({ type: AdminRoleDto })
  @ApiResponse({ status: 400, description: 'Role name already exists' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiUnauthorizedResponse()
  async updateRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminRoleUpdateDto,
  ): Promise<AdminRoleDto> {
    const role = await this.adminRoleApiService.update(id, dto);
    return AdminRoleDto.create(role);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a role',
    description: 'Requires ADMIN role. Cannot delete the ADMIN role or roles assigned to users.',
  })
  @ApiParam({ name: 'id', type: String, description: 'The UUID of the role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete ADMIN role or role assigned to users' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiUnauthorizedResponse()
  async deleteRole(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.adminRoleApiService.delete(id);
  }
}
