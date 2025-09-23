import { Injectable } from '@nestjs/common';
import { Repository, IsNull, Brackets } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  WorkspaceType,
  PipelineType,
  PipelineEntity,
  PipelineState,
  WorkflowEntity,
  WorkflowState,
} from '@loopstack/shared';
import { ConfigurationService } from '@loopstack/core';

export interface DashboardStats {
  workspaceCount: number;
  totalAutomations: number;
  totalAutomationRuns: number;
  completedRuns: number;
  errorRuns: number;
  inProgressRuns: number;
  recentErrors: WorkflowEntity[];
  recentRuns: PipelineEntity[];
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly configService: ConfigurationService,
    @InjectRepository(PipelineEntity)
    private readonly pipelineRepository: Repository<PipelineEntity>,
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
  ) {}

  async getDashboardStats(user: string | null): Promise<DashboardStats> {
    const workspaceCount =
      this.configService.getAll<WorkspaceType>('workspaces').length;
    const pipelineTypes = this.configService.getAll<PipelineType>('pipelines');
    const automations = pipelineTypes.filter(
      (p) => p.config.type === 'root',
    ).length;

    const userFilter = user === null ? IsNull() : user;
    const baseQuery = this.pipelineRepository
      .createQueryBuilder('pipeline')
      .where({ createdBy: userFilter });

    const [total, completed, failed, inProgress, recentRuns, recentErrors] =
      await Promise.all([
        baseQuery.clone().getCount(),
        baseQuery
          .clone()
          .andWhere({ status: PipelineState.Completed })
          .getCount(),
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
        baseQuery
          .clone()
          .orderBy('pipeline.createdAt', 'DESC')
          .take(7)
          .getMany(),
        this.workflowRepository
          .createQueryBuilder('workflow')
          .where({ createdBy: userFilter })
          .andWhere({ status: WorkflowState.Failed })
          .orderBy('workflow.createdAt', 'DESC')
          .take(7)
          .getMany(),
      ]);

    return {
      workspaceCount,
      totalAutomations: automations,
      totalAutomationRuns: total,
      completedRuns: completed,
      errorRuns: failed,
      inProgressRuns: inProgress,
      recentErrors,
      recentRuns,
    };
  }
}
