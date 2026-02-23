import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleName } from '@loopstack/common';

@Injectable()
export class AdminRoleApiService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<Role[]> {
    const roles = await this.roleRepository.find({
      relations: ['users'],
    });

    return roles;
  }

  async findOneById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async create(data: { name: string; description?: string }): Promise<Role> {
    const existing = await this.roleRepository.findOne({
      where: { name: data.name },
    });

    if (existing) {
      throw new BadRequestException(`Role with name '${data.name}' already exists`);
    }

    const role = this.roleRepository.create(data);
    const saved = await this.roleRepository.save(role);

    return this.findOneById(saved.id);
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (data.name && data.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { name: data.name },
      });

      if (existing) {
        throw new BadRequestException(`Role with name '${data.name}' already exists`);
      }
    }

    Object.assign(role, data);
    await this.roleRepository.save(role);

    return this.findOneById(id);
  }

  async delete(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role.name === (RoleName.ADMIN as string)) {
      throw new BadRequestException('Cannot delete the ADMIN role');
    }

    if (role.users?.length > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' — it is assigned to ${role.users.length} user(s)`,
      );
    }

    await this.roleRepository.delete(id);
  }
}
