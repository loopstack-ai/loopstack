import { Injectable } from '@nestjs/common';
import { NamespacesType } from '../../processor/interfaces/namespaces-type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeObject } from '@loopstack/shared';
import { WorkflowStateEntity } from '../entities/workflow-state.entity';
import { WorkflowEntity } from '../entities/workflow.entity';
import { DocumentEntity } from '../entities/document.entity';
import { ProjectEntity } from '../entities/project.entity';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
  ) {}

  create(dto: Partial<DocumentEntity>): DocumentEntity {
    return this.documentRepository.create(dto);
  }
}
