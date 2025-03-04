import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {DocumentEntity} from '../entities';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
  ) {}

  create(dto: Partial<DocumentEntity>): DocumentEntity {
    if (!dto.workflow) {
      throw new Error(`Document needs a workflow relation. Create document failed.`)
    }
    return this.documentRepository.create(dto);
  }

  createDocumentsQuery(
    projectId: string,
    workspaceId: string,
    where: {
      name: string;
      type?: string;
    },
    options?: {
      isGlobal?: boolean;
      namespaceIds?: string[];
      ltWorkflowIndex?: number;
    },
  ) {

    const queryBuilder = this.documentRepository.createQueryBuilder();

    queryBuilder.andWhere(where);

    if (undefined !== options?.ltWorkflowIndex) {
      queryBuilder.andWhere(`workflow_index < :ltWorkflowIndex`, {
        ltWorkflowIndex: options.ltWorkflowIndex,
      });
    }

    // we dont want invalidate items
    queryBuilder.andWhere('is_invalidated = false');

    if (!options?.isGlobal) {
      // ofc needs to be from same project
      queryBuilder.andWhere('project_id = :projectId', {
        projectId,
      });
    } else {
      queryBuilder.andWhere('workspace_id = :workspaceId', {
        workspaceId,
      });
    }

    if (options?.namespaceIds?.length) {
      queryBuilder.andWhere('namespace_ids @> ARRAY[:...namespaceIds]::uuid[]', { namespaceIds: options.namespaceIds })
    }

    queryBuilder.orderBy('workflow_index', 'DESC');

    // console.log(queryBuilder.getSql(), queryBuilder.getParameters());

    return queryBuilder;
  }
}
