import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EXECUTION_SCOPE } from '@loopstack/common';
import { ClientMessageService } from '@loopstack/core';
import { WorkspaceEnvironmentContextDto } from '../dtos/index.js';
import { WorkspaceEnvironmentEntity } from '../entities/index.js';
import { RemoteClient } from './remote-client.service.js';

const ENV_CACHE_KEY = Symbol('EnvironmentService');

interface ScopeAccessor {
  get(): { workspaceId: string; userId: string } & Record<string, unknown>;
  getOrLoad<T>(key: symbol, loader: () => Promise<T>): Promise<T>;
}

/**
 * Service that resolves the remote agent URL for the current execution scope (preferring the `sandbox`
 * slot) and manages a workspace's environment records; inject it in tools and transitions to reach the
 * right remote server, or to read, replace, and delete a workspace's environments.
 *
 * @providedBy RemoteClientModule
 * @public
 */
@Injectable()
export class EnvironmentService {
  constructor(
    @Inject(EXECUTION_SCOPE) private readonly scope: ScopeAccessor,
    @InjectRepository(WorkspaceEnvironmentEntity) private readonly repo: Repository<WorkspaceEnvironmentEntity>,
    private readonly remote: RemoteClient,
    private readonly clientMessages: ClientMessageService,
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
    const entities = environments.map((env) =>
      // An assignment that carries a live URL is running (the provisioner only persists it once the machine
      // is up); without one it's a placeholder. Keeps `status` meaningful for the assignment path too, so the
      // preview panel's running-only filter applies uniformly to hub-managed and local environments.
      this.repo.create({
        ...env,
        workspaceId,
        status: env.status ?? (env.connectionUrl || env.agentUrl ? 'running' : 'stopped'),
      }),
    );
    return this.repo.save(entities);
  }

  /**
   * Delete all environments for a workspace.
   */
  async deleteByWorkspace(workspaceId: string): Promise<void> {
    await this.repo.delete({ workspaceId });
  }

  /**
   * Mark a slot as running: upsert its row for the workspace with the live agent URL and
   * `status: 'running'`. Creates the row if the slot was never connected. Used by local provisioners
   * (e.g. a disposable sandbox) that toggle a slot up and down rather than assigning a remote machine.
   */
  async markRunning(
    workspaceId: string,
    slotId: string,
    data: { agentUrl: string; remoteEnvironmentId: string; type?: string; connectionUrl?: string; local?: boolean },
  ): Promise<void> {
    const existing = await this.repo.findOne({ where: { workspaceId, slotId } });
    const entity = this.repo.create({
      ...existing,
      workspaceId,
      slotId,
      type: data.type ?? existing?.type ?? 'local',
      remoteEnvironmentId: data.remoteEnvironmentId,
      agentUrl: data.agentUrl,
      // `connectionUrl` is the previewable app URL, never the control-plane agent URL: pass it through when
      // given, keep any prior value on a re-mark, else leave it unset (an agent-only slot stays non-previewable).
      connectionUrl: data.connectionUrl ?? existing?.connectionUrl ?? null,
      local: data.local ?? existing?.local ?? true,
      status: 'running',
    });
    await this.repo.save(entity);
    this.announceChange(workspaceId);
  }

  /** Mark a slot as stopped: keep the row (so the UI can show it) but clear its agent and connection URLs. */
  async markStopped(workspaceId: string, slotId: string): Promise<void> {
    await this.repo.update({ workspaceId, slotId }, { agentUrl: null, connectionUrl: null, status: 'stopped' });
    this.announceChange(workspaceId);
  }

  /**
   * Notify connected clients that this workspace's environments changed, so the Studio environment list and
   * preview panel refetch and pick up the new connection URL/status live (no page reload). Best-effort: the
   * `userId` comes from the current execution scope, so callers outside a run must announce it themselves.
   */
  private announceChange(workspaceId: string): void {
    const { userId } = this.scope.get();
    this.clientMessages.dispatchWorkspaceEvent('environment.updated', workspaceId, userId);
  }

  private resolveAgentUrl(envs: WorkspaceEnvironmentContextDto[], slotId?: string): string {
    // Explicit slot → that exact slot (fails if it's stopped). Otherwise prefer a *running* env (one with
    // an agent URL), favouring the conventional `sandbox` slot, so a stopped slot doesn't shadow a live one.
    const running = envs.filter((e) => e.agentUrl);
    const env = slotId
      ? envs.find((e) => e.slotId === slotId)
      : (running.find((e) => e.slotId === 'sandbox') ?? running[0]);
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
