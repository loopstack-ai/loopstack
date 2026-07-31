import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  /**
   * All records of the run tree rooted at `rootId` — the root's own calls plus every
   * descendant sub-workflow's, resolved via the workflow parent chain.
   */
  async findByRunTree(rootId: string): Promise<ToolCallRecordEntity[]> {
    const rows = (await this.repository.query(
      `WITH RECURSIVE tree AS (
         SELECT id FROM core_workflow WHERE id = $1
         UNION ALL
         SELECT w.id FROM core_workflow w JOIN tree t ON w.parent_id = t.id
       )
       SELECT id FROM tree`,
      [rootId],
    )) as { id: string }[];

    return this.repository.find({
      where: { workflowId: In(rows.map((row) => row.id)) },
      order: { createdAt: 'ASC', seq: 'ASC' },
    });
  }
}
