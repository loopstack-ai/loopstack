import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CODE_WORKSPACE_PROVISIONER, type CodeWorkspaceProvisioner } from './code-workspace.provisioner.js';

/**
 * Releases what a deleted workspace was holding: its containers, its volumes and its files.
 *
 * The state belongs to this module, so letting it go belongs here too. `@loopstack/api` emits
 * `workspace.deleted` after the delete commits, and the provisioner call is idempotent, so this is the whole
 * of it. A deleted run owns nothing on disk — the checkout is its workspace's — and tears its own containers
 * down; what a crash leaves standing is found by the orphan sweep.
 *
 * **It runs in the background.** `emit` does not await an async listener, so the delete request returns
 * immediately and a multi-gigabyte removal continues after it. Which is also why nothing here ever throws:
 * there is no caller to catch it, and an unhandled rejection would take the process down over a directory.
 *
 * **A failure is a log line, not a lost resource.** State whose owning row is gone is exactly what an
 * orphan sweep looks for, so anything this fails to remove is found again by the next one. That is the
 * trade for not making every deletion a visible run.
 */
@Injectable()
export class WorkspaceCleanupListener {
  private readonly logger = new Logger(WorkspaceCleanupListener.name);

  constructor(@Inject(CODE_WORKSPACE_PROVISIONER) private readonly workspace: CodeWorkspaceProvisioner) {}

  @OnEvent('workspace.deleted')
  async onWorkspaceDeleted(payload: { id: string }): Promise<void> {
    await this.release(
      () => this.workspace.removeWorkspaceState(payload.id),
      `the state of deleted workspace ${payload.id}`,
    );
  }

  private async release(work: () => Promise<void>, what: string): Promise<void> {
    try {
      await work();
      this.logger.log(`Released ${what}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not release ${what}: ${message} — an orphan sweep will find it.`);
    }
  }
}
