import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToolCallRecordEntity } from '@loopstack/common';

/**
 * Persistence for tool-call audit records (debug mode). Read side backs the
 * `GET /workflows/:id/tool-calls` endpoint and `loopstack runs <id> --record`.
 */
@Injectable()
export class ToolCallAuditService {
  constructor(
    @InjectRepository(ToolCallRecordEntity)
    private readonly repository: Repository<ToolCallRecordEntity>,
  ) {}

  async save(record: Omit<ToolCallRecordEntity, 'id' | 'createdAt'>): Promise<void> {
    await this.repository.save(this.repository.create(record));
  }

  async findByWorkflowId(workflowId: string): Promise<ToolCallRecordEntity[]> {
    return this.repository.find({
      where: { workflowId },
      order: { createdAt: 'ASC', seq: 'ASC' },
    });
  }
}
