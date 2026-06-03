import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EXECUTION_SCOPE } from '@loopstack/common';
import { WorkspaceEnvironmentContextDto } from '../dtos/index.js';
import { WorkspaceEnvironmentEntity } from '../entities/index.js';

const ENV_CACHE_KEY = Symbol('EnvironmentService');

interface ScopeAccessor {
  get(): { workspaceId: string } & Record<string, unknown>;
  getOrLoad<T>(key: symbol, loader: () => Promise<T>): Promise<T>;
}

@Injectable()
export class EnvironmentService {
  constructor(
    @Inject(EXECUTION_SCOPE) private readonly scope: ScopeAccessor,
    @InjectRepository(WorkspaceEnvironmentEntity) private readonly repo: Repository<WorkspaceEnvironmentEntity>,
  ) {}

  /**
   * Get environments for the current execution scope (cached per execution).
   * Use inside tools and workflow transitions.
   */
  getEnvironments(): Promise<WorkspaceEnvironmentContextDto[]> {
    return this.scope.getOrLoad(ENV_CACHE_KEY, async () => {
      const { workspaceId } = this.scope.get();
      const entities = await this.repo.find({ where: { workspaceId } });
      return WorkspaceEnvironmentContextDto.fromEntities(entities);
    });
  }

  /**
   * Resolve the agent URL for the current execution scope.
   * Prefers `slotId === 'sandbox'`, falls back to the first environment.
   */
  async getAgentUrl(slotId?: string): Promise<string> {
    const envs = await this.getEnvironments();
    return this.resolveAgentUrl(envs, slotId);
  }

  /**
   * Get environments for a workspace by ID (no execution scope needed).
   * Use in controllers and other non-execution contexts.
   */
  async getEnvironmentsByWorkspace(workspaceId: string): Promise<WorkspaceEnvironmentContextDto[]> {
    const entities = await this.repo.find({ where: { workspaceId } });
    return WorkspaceEnvironmentContextDto.fromEntities(entities);
  }

  /**
   * Resolve the agent URL for a specific workspace (no execution scope needed).
   * Use in controllers.
   */
  async getAgentUrlForWorkspace(workspaceId: string, slotId?: string): Promise<string> {
    const envs = await this.getEnvironmentsByWorkspace(workspaceId);
    return this.resolveAgentUrl(envs, slotId);
  }

  /**
   * Find all environment entities for a workspace.
   */
  async findByWorkspace(workspaceId: string): Promise<WorkspaceEnvironmentEntity[]> {
    return this.repo.find({ where: { workspaceId } });
  }

  /**
   * Replace all environments for a workspace (delete existing, create new).
   */
  async replaceAll(
    workspaceId: string,
    environments: Partial<WorkspaceEnvironmentEntity>[],
  ): Promise<WorkspaceEnvironmentEntity[]> {
    await this.repo.delete({ workspaceId });
    const entities = environments.map((env) => this.repo.create({ ...env, workspaceId }));
    return this.repo.save(entities);
  }

  /**
   * Delete all environments for a workspace.
   */
  async deleteByWorkspace(workspaceId: string): Promise<void> {
    await this.repo.delete({ workspaceId });
  }

  private resolveAgentUrl(envs: WorkspaceEnvironmentContextDto[], slotId?: string): string {
    const env = slotId ? envs.find((e) => e.slotId === slotId) : (envs.find((e) => e.slotId === 'sandbox') ?? envs[0]);
    if (!env?.agentUrl) {
      throw new Error('No environment with agent URL found');
    }
    return env.agentUrl;
  }
}
