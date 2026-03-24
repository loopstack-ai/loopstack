import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecretEntity } from '@loopstack/common';

@Injectable()
export class SecretService {
  constructor(
    @InjectRepository(SecretEntity)
    private secretRepository: Repository<SecretEntity>,
  ) {}

  async findAllByWorkspace(workspaceId: string): Promise<SecretEntity[]> {
    return this.secretRepository.find({
      where: { workspaceId },
      order: { key: 'ASC' },
    });
  }

  async create(workspaceId: string, data: { key: string; value: string }): Promise<SecretEntity> {
    const secret = this.secretRepository.create({
      workspaceId,
      key: data.key,
      value: data.value,
    });
    return this.secretRepository.save(secret);
  }

  async update(id: string, workspaceId: string, data: { value?: string }): Promise<SecretEntity> {
    const secret = await this.secretRepository.findOne({
      where: { id, workspaceId },
    });

    if (!secret) {
      throw new NotFoundException(`Secret with ID ${id} not found`);
    }

    if (data.value !== undefined) secret.value = data.value;

    return this.secretRepository.save(secret);
  }

  async upsert(workspaceId: string, data: { key: string; value: string }): Promise<SecretEntity> {
    const existing = await this.secretRepository.findOne({
      where: { workspaceId, key: data.key },
    });

    if (existing) {
      existing.value = data.value;
      return this.secretRepository.save(existing);
    }

    return this.create(workspaceId, data);
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    const secret = await this.secretRepository.findOne({
      where: { id, workspaceId },
    });

    if (!secret) {
      throw new NotFoundException(`Secret with ID ${id} not found`);
    }

    await this.secretRepository.remove(secret);
  }
}
