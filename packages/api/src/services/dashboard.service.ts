import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { WorkflowEntity, WorkflowState } from '@loopstack/common';

export interface DashboardStats {
  totalAutomationRuns: number;
  completedRuns: number;
  errorRuns: number;
  inProgressRuns: number;
  recentErrors: WorkflowEntity[];
  recentRuns: WorkflowEntity[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
  ) {}

  async getDashboardStats(user: string): Promise<DashboardStats> {
    const baseQuery = this.workflowRepository.createQueryBuilder('workflow').where({
      createdBy: user,
    });

    const [total, completed, failed, inProgress, recentRuns, recentErrors] = await Promise.all([
      baseQuery.clone().getCount(),
      baseQuery.clone().andWhere({ status: WorkflowState.Completed }).getCount(),
      baseQuery.clone().andWhere({ status: WorkflowState.Failed }).getCount(),
      baseQuery
        .clone()
        .andWhere(
          new Brackets((qb) => {
            qb.where({ status: WorkflowState.Running })
              .orWhere({ status: WorkflowState.Pending })
              .orWhere({ status: WorkflowState.Canceled })
              .orWhere({ status: WorkflowState.Paused });
          }),
        )
        .getCount(),
      baseQuery.clone().orderBy('workflow.updatedAt', 'DESC').limit(3).getMany(),
      baseQuery
        .clone()
        .andWhere({ status: WorkflowState.Failed })
        .orderBy('workflow.updatedAt', 'DESC')
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
