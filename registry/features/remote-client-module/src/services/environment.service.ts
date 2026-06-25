import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EXECUTION_SCOPE } from '@loopstack/common';
import { WorkspaceEnvironmentContextDto } from '../dtos/index.js';
import { WorkspaceEnvironmentEntity } from '../entities/index.js';
import { RemoteClient } from './remote-client.service.js';

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
    private readonly remote: RemoteClient,
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
   * Resolve the agent URL and verify the remote agent is reachable.
   * Use as a pre-flight check at the start of workflows that depend on
   * remote-client tools (grep, glob, read, bash, …). Throws a user-readable
   * error if the slot has no environment connected or the agent does not
   * respond to GET /health.
   */
  async assertReachable(slotId?: string): Promise<string> {
    const agentUrl = await this.getAgentUrl(slotId);
    try {
      await this.remote.ping(agentUrl);
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw new Error(
        `Remote environment${slotId ? ` "${slotId}"` : ''} is not reachable at ${agentUrl}. ` +
          `Ensure the remote agent is running and the connection URL is correct. (${reason})`,
        { cause },
      );
    }
    return agentUrl;
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
      const target = slotId ? `slot "${slotId}"` : 'any slot';
      throw new Error(
        `No environment with agent URL connected to ${target}. ` +
          `Make sure an environment is set up in your app and is connected to the current workspace.`,
      );
    }
    return env.agentUrl;
  }
}
