import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { PipelineEntity, PipelineState, WorkflowState } from '@loopstack/common';

export interface DashboardStats {
  totalAutomationRuns: number;
  completedRuns: number;
  errorRuns: number;
  inProgressRuns: number;
  recentErrors: PipelineEntity[];
  recentRuns: PipelineEntity[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(PipelineEntity)
    private readonly pipelineRepository: Repository<PipelineEntity>,
  ) {}

  async getDashboardStats(user: string): Promise<DashboardStats> {
    const baseQuery = this.pipelineRepository.createQueryBuilder('pipeline').where({
      createdBy: user,
    });

    const [total, completed, failed, inProgress, recentRuns, recentErrors] = await Promise.all([
      baseQuery.clone().getCount(),
      baseQuery.clone().andWhere({ status: PipelineState.Completed }).getCount(),
      baseQuery.clone().andWhere({ status: PipelineState.Failed }).getCount(),
      baseQuery
        .clone()
        .andWhere(
          new Brackets((qb) => {
            qb.where({ status: PipelineState.Running })
              .orWhere({ status: PipelineState.Pending })
              .orWhere({ status: PipelineState.Canceled })
              .orWhere({ status: PipelineState.Paused });
          }),
        )
        .getCount(),
      baseQuery.clone().orderBy('pipeline.updatedAt', 'DESC').limit(3).getMany(),
      baseQuery
        .clone()
        .andWhere({ status: WorkflowState.Failed })
        .orderBy('pipeline.updatedAt', 'DESC')
        .limit(3)
        .getMany(),
    ]);

    return {
      totalAutomationRuns: total,
      completedRuns: completed,
      errorRuns: failed,
      inProgressRuns: inProgress,
      recentErrors,
      recentRuns,
    };
  }
}
