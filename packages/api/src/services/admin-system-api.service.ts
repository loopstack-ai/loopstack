import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PipelineEntity, PipelineState, User, WorkflowEntity, WorkflowState, WorkspaceEntity } from '@loopstack/common';
import { SseEventService } from './sse-event.service';

export interface SystemHealth {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  database: {
    connected: boolean;
    responseTimeMs: number;
  };
}

export interface SystemStats {
  users: { total: number; active: number };
  workspaces: { total: number };
  pipelines: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
  workflows: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
}

export interface SseConnectionInfo {
  totalConnections: number;
  connections: string[];
}

@Injectable()
export class AdminSystemApiService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(PipelineEntity)
    private readonly pipelineRepository: Repository<PipelineEntity>,
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
    private readonly sseEventService: SseEventService,
  ) {}

  async getHealth(): Promise<SystemHealth> {
    const memory = process.memoryUsage();

    let dbConnected: boolean;
    let dbResponseTimeMs = 0;
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      dbResponseTimeMs = Date.now() - start;
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    return {
      status: dbConnected ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      },
      database: {
        connected: dbConnected,
        responseTimeMs: dbResponseTimeMs,
      },
    };
  }

  async getStats(): Promise<SystemStats> {
    const [
      totalUsers,
      activeUsers,
      totalWorkspaces,
      totalPipelines,
      runningPipelines,
      completedPipelines,
      failedPipelines,
      totalWorkflows,
      runningWorkflows,
      completedWorkflows,
      failedWorkflows,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.workspaceRepository.count(),
      this.pipelineRepository.count(),
      this.pipelineRepository.count({ where: { status: PipelineState.Running } }),
      this.pipelineRepository.count({ where: { status: PipelineState.Completed } }),
      this.pipelineRepository.count({ where: { status: PipelineState.Failed } }),
      this.workflowRepository.count(),
      this.workflowRepository.count({ where: { status: WorkflowState.Running } }),
      this.workflowRepository.count({ where: { status: WorkflowState.Completed } }),
      this.workflowRepository.count({ where: { status: WorkflowState.Failed } }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers },
      workspaces: { total: totalWorkspaces },
      pipelines: {
        total: totalPipelines,
        running: runningPipelines,
        completed: completedPipelines,
        failed: failedPipelines,
      },
      workflows: {
        total: totalWorkflows,
        running: runningWorkflows,
        completed: completedWorkflows,
        failed: failedWorkflows,
      },
    };
  }

  getConnections(): SseConnectionInfo {
    return {
      totalConnections: this.sseEventService.getConnectionCount(),
      connections: this.sseEventService.getActiveConnections(),
    };
  }
}
