import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NamespaceEntity } from '../entities/namespace.entity';
import { NamespaceCreateInterface } from '../interfaces/namespace-create.interface';

@Injectable()
export class NamespacesService {
  constructor(
    @InjectRepository(NamespaceEntity)
    private namespaceRepository: Repository<NamespaceEntity>,
  ) {}

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
        workspaceId: createNamespaceDto.workspaceId,
      },
      relations: ['projects', 'workflows'],
    });

    if (namespace) {
      // Verify that parentId is consistent
      if (namespace.parentId !== createNamespaceDto.parentId) {
        console.log('here', namespace.parentId, createNamespaceDto.parentId);
        // throw new Error('Cannot change parent for an existing namespace');
      }

      // Merge metadata if provided
      if (createNamespaceDto.metadata) {
        namespace.metadata = {
          ...namespace.metadata,
          ...createNamespaceDto.metadata,
        };
      }
    } else {
      // Create a new namespace
      namespace = this.namespaceRepository.create({
        name: createNamespaceDto.name,
        model: createNamespaceDto.model,
        parentId: createNamespaceDto.parentId,
        workspaceId: createNamespaceDto.workspaceId,
        metadata: createNamespaceDto.metadata,
      });
    }

    return this.namespaceRepository.save(namespace);
  }
}
