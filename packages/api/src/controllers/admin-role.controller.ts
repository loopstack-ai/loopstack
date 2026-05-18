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
import { RoleName, Roles } from '@loopstack/common';
import { AdminRoleCreateDto } from '../dtos/admin-role-create.dto';
import { AdminRoleItemDto } from '../dtos/admin-role-item.dto';
import { AdminRoleUpdateDto } from '../dtos/admin-role-update.dto';
import { AdminRoleDto } from '../dtos/admin-role.dto';
import { AdminRoleApiService } from '../services/admin-role-api.service';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Roles(RoleName.ADMIN)
@Controller('api/v1/admin/roles')
export class AdminRoleController {
  constructor(private readonly adminRoleApiService: AdminRoleApiService) {}

  @Get()
  async getRoles(): Promise<AdminRoleItemDto[]> {
    const roles = await this.adminRoleApiService.findAll();
    return roles.map((role) => AdminRoleItemDto.create(role));
  }

  @Get(':id')
  async getRoleById(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminRoleDto> {
    const role = await this.adminRoleApiService.findOneById(id);
    return AdminRoleDto.create(role);
  }

  @Post()
  async createRole(@Body() dto: AdminRoleCreateDto): Promise<AdminRoleDto> {
    const role = await this.adminRoleApiService.create(dto);
    return AdminRoleDto.create(role);
  }

  @Patch(':id')
  async updateRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminRoleUpdateDto,
  ): Promise<AdminRoleDto> {
    const role = await this.adminRoleApiService.update(id, dto);
    return AdminRoleDto.create(role);
  }

  @Delete(':id')
  async deleteRole(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.adminRoleApiService.delete(id);
  }
}
