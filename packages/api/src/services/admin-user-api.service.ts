import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role, User } from '@loopstack/common';
import { AdminUserFilterDto } from '../dtos/admin-user-filter.dto';
import { AdminUserSortByDto } from '../dtos/admin-user-sort-by.dto';

@Injectable()
export class AdminUserApiService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    filter: AdminUserFilterDto,
    sortBy: AdminUserSortByDto[],
    pagination: {
      page: number | undefined;
      limit: number | undefined;
    },
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const defaultLimit = this.configService.get<number>('ADMIN_USER_DEFAULT_LIMIT', 100);

    const queryBuilder = this.userRepository.createQueryBuilder('user').leftJoinAndSelect('user.roles', 'role');

    const where: Record<string, unknown> = {};
    if (filter.type !== undefined) {
      where['type'] = filter.type;
    }
    if (filter.isActive !== undefined) {
      where['isActive'] = filter.isActive;
    }

    if (Object.keys(where).length > 0) {
      queryBuilder.where(where);
    }

    const orderBy = sortBy.reduce(
      (acc, sort) => {
        acc[`user.${sort.field}`] = sort.order;
        return acc;
      },
      {} as Record<string, 'ASC' | 'DESC'>,
    );

    if (Object.keys(orderBy).length > 0) {
      queryBuilder.orderBy(orderBy);
    }

    queryBuilder.take(pagination.limit ?? defaultLimit);
    queryBuilder.skip(pagination.page && pagination.limit ? pagination.page * pagination.limit : 0);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page: pagination.page ?? 1,
      limit: pagination.limit ?? defaultLimit,
    };
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateStatus(id: string, isActive: boolean, currentUserId: string): Promise<User> {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot change your own active status');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.isActive = isActive;
    return this.userRepository.save(user);
  }

  async assignRoles(id: string, roleIds: string[]): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const roles = await this.roleRepository.find({
      where: { id: In(roleIds) },
    });

    if (roles.length !== roleIds.length) {
      const foundIds = roles.map((r) => r.id);
      const missing = roleIds.filter((rid) => !foundIds.includes(rid));
      throw new BadRequestException(`Roles not found: ${missing.join(', ')}`);
    }

    user.roles = roles;
    await this.userRepository.save(user);

    return this.findOneById(id);
  }

  async removeRole(id: string, roleId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const roleExists = user.roles.some((r) => r.id === roleId);
    if (!roleExists) {
      throw new NotFoundException(`User does not have role with ID ${roleId}`);
    }

    user.roles = user.roles.filter((r) => r.id !== roleId);
    await this.userRepository.save(user);

    return this.findOneById(id);
  }
}
