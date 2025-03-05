import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NamespaceEntity } from '../entities/namespace.entity';
import { NamespaceCreateInterface } from '../interfaces/namespace-create.interface';
import {ProjectEntity} from "../entities";

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

  async createRootNamespace(project: ProjectEntity): Promise<NamespaceEntity> {
    return this.create({
      name: project.model,
      model: project.model,
      projectId: project.id,
      workspaceId: project.workspaceId,
      metadata: {
        title: project.title
      },
      createdBy: project.createdBy,
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
        projectId: createNamespaceDto.projectId,
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
        parent: createNamespaceDto.parent ?? undefined,
        workspaceId: createNamespaceDto.workspaceId,
        projectId: createNamespaceDto.projectId,
        metadata: createNamespaceDto.metadata,
      });

      return this.namespaceRepository.save(namespace);
    }

    return namespace;
  }
}
