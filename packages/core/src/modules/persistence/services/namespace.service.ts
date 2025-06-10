import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NamespaceEntity, PipelineEntity } from '@loopstack/shared';
import { NamespaceCreateInterface } from '@loopstack/shared';

@Injectable()
export class NamespacesService {
  constructor(
    @InjectRepository(NamespaceEntity)
    private namespaceRepository: Repository<NamespaceEntity>,
  ) {}

  /**
   * Find namespace IDs by name, model, and workspaceId
   */
  async findNamespaceIdsByAttributes(
    name: string,
    model: string,
    workspaceId: string,
  ): Promise<string[]> {
    const namespaces = await this.namespaceRepository.find({
      where: {
        name,
        model,
        workspaceId,
      },
      select: ['id'],
    });

    return namespaces.map((namespace) => namespace.id);
  }

  /**
   * Removes multiple namespaces and all their descendant namespaces from the provided array.
   */
  omitNamespacesByNames(
    names: string[],
    namespaces: NamespaceEntity[],
  ): NamespaceEntity[] {
    const idsToRemove = new Set<string>();

    // Recursive function to collect a namespace's ID and all its descendant IDs
    const collectDescendantIds = (id: string) => {
      idsToRemove.add(id);
      const children = namespaces.filter((item) => item.parentId === id);
      for (const child of children) {
        collectDescendantIds(child.id);
      }
    };

    for (const name of names) {
      const namespace = namespaces.find((item) => item.name === name);
      if (namespace) {
        collectDescendantIds(namespace.id);
      }
    }

    return namespaces.filter((item) => !idsToRemove.has(item.id));
  }

  async createRootNamespace(pipeline: PipelineEntity): Promise<NamespaceEntity> {
    return this.create({
      name: pipeline.model,
      model: pipeline.model,
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
        model: createNamespaceDto.model,
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
        model: createNamespaceDto.model,
        parent: (createNamespaceDto.parent as NamespaceEntity) ?? undefined,
        workspaceId: createNamespaceDto.workspaceId,
        pipelineId: createNamespaceDto.pipelineId,
        metadata: createNamespaceDto.metadata,
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
