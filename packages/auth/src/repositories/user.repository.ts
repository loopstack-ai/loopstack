import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { User } from '@loopstack/common';
import { UserTypeEnum } from '@loopstack/common';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['roles'],
    });
  }

  async findLocalUser(): Promise<User | null> {
    return this.repository.findOne({
      where: {
        type: UserTypeEnum.Local,
      },
      relations: ['roles'],
    });
  }

  /** The single local-mode identity — created lazily on first use. */
  async findOrCreateLocalUser(): Promise<User> {
    const existing = await this.findLocalUser();
    if (existing) return existing;

    return this.create({
      id: randomUUID(),
      type: UserTypeEnum.Local,
      isActive: true,
      roles: [],
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, userData);
    return this.findById(id);
  }

  getRepository() {
    return this.repository;
  }
}
