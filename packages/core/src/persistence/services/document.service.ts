import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../entities';
import {NamespaceEntity} from "../entities/namespace.entity";

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
  ) {}

  create(dto: Partial<DocumentEntity>): DocumentEntity {
    return this.documentRepository.create(dto);
  }

  createQuery(
    projectId: string,
    workspaceId: string,
    where: {
      name: string;
      type?: string;
    },
    options?: {
      isGlobal?: boolean;
      namespaces?: any;
      ltWorkflowIndex?: number;
    },
  ) {
    const queryBuilder = this.documentRepository.createQueryBuilder();

    queryBuilder.andWhere(where);

    if (options?.ltWorkflowIndex) {
      queryBuilder.andWhere(`workflow_index < :ltWorkflowIndex`, {
        ltCreatorsIndex: options.ltWorkflowIndex,
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

    // todo
    // if (options?.namespaces) {
    //   const keys = Object.entries(options?.namespaces)
    //     .filter(([key, value]) => undefined !== value)
    //     .map(([key]) => key);
    //
    //   keys.forEach((key, index) => {
    //     queryBuilder.andWhere(`namespaces @> :namespace${index}`, {
    //       [`namespace${index}`]: JSON.stringify({
    //         [key]: options?.namespaces![key],
    //       }),
    //     });
    //   });
    // }

    queryBuilder.orderBy('workflow_index', 'DESC');

    // console.log(queryBuilder.getSql(), queryBuilder.getParameters());

    return queryBuilder;
  }
}
