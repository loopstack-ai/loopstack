import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NamespaceEntity, PipelineEntity } from '@loopstack/common';
import type { NamespaceCreateInterface } from '@loopstack/contracts/types';

@Injectable()
export class NamespacesService {
  constructor(
    @InjectRepository(NamespaceEntity)
    private namespaceRepository: Repository<NamespaceEntity>,
  ) {}

  async createRootNamespace(
    pipeline: PipelineEntity,
  ): Promise<NamespaceEntity> {
    return this.create({
      name: 'Root',
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      metadata: {
        title: pipeline.title,
      },
      createdBy: pipeline.createdBy,
      parent: null,
    });
  }

  /**
   * Create a new namespace or update an existing one
   */
  async create(
    createNamespaceDto: NamespaceCreateInterface,
  ): Promise<NamespaceEntity> {
    // Check if namespace with the same name and workspace already exists
    let namespace = await this.namespaceRepository.findOne({
      where: {
        name: createNamespaceDto.name,
        pipelineId: createNamespaceDto.pipelineId,
      },
      relations: ['workflows'],
    });

    if (namespace) {
      // Verify that parentId is consistent
      if (namespace.parentId !== (createNamespaceDto.parent?.id ?? null)) {
        throw new Error('Cannot change parent for an existing namespace');
      }

      // Merge metadata if provided
      if (createNamespaceDto.metadata) {
        namespace.metadata = {
          ...namespace.metadata,
          ...createNamespaceDto.metadata,
        };

        return this.namespaceRepository.save(namespace);
      }
    } else {
      // Create a new namespace
      namespace = this.namespaceRepository.create({
        name: createNamespaceDto.name,
        parent: (createNamespaceDto.parent as NamespaceEntity) ?? undefined,
        workspaceId: createNamespaceDto.workspaceId,
        pipeline: { id: createNamespaceDto.pipelineId } as PipelineEntity,
        metadata: createNamespaceDto.metadata,
        createdBy: createNamespaceDto.createdBy,
      });

      return this.namespaceRepository.save(namespace);
    }

    return namespace;
  }

  async getChildNamespaces(parentId: string): Promise<NamespaceEntity[]> {
    return this.namespaceRepository
      .createQueryBuilder('namespace')
      .select('namespace.id')
      .where('namespace.parentId = :parentId', { parentId })
      .getMany();
  }

  async delete(entities: NamespaceEntity[]) {
    await this.namespaceRepository.remove(entities);
  }
}
