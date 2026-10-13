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
 * **It runs in the background, one workspace at a time.** `emit` does not await an async listener, so the
 * delete request returns immediately and a multi-gigabyte removal continues after it. Which is also why
 * nothing here ever throws: there is no caller to catch it, and an unhandled rejection would take the
 * process down over a directory. A batch delete emits one event per workspace in a burst; the removals are
 * chained so they never overlap — a dozen concurrent removals would contend for the Docker daemon and the
 * disk and stall what else the process is doing.
 *
 * **A failure is a log line, not a lost resource.** State whose owning row is gone is exactly what an
 * orphan sweep looks for, so anything this fails to remove is found again by the next one. That is the
 * trade for not making every deletion a visible run.
 */
@Injectable()
export class WorkspaceCleanupListener {
  private readonly logger = new Logger(WorkspaceCleanupListener.name);

  /** The tail of the removal queue: each removal starts when the one before it has settled. */
  private tail: Promise<void> = Promise.resolve();

  constructor(@Inject(CODE_WORKSPACE_PROVISIONER) private readonly workspace: CodeWorkspaceProvisioner) {}

  /** Resolves when this workspace's removal has settled — after every removal queued before it. */
  @OnEvent('workspace.deleted')
  onWorkspaceDeleted(payload: { id: string }): Promise<void> {
    // `release` never rejects, so the chain cannot break.
    this.tail = this.tail.then(() =>
      this.release(
        () => this.workspace.removeWorkspaceState(payload.id),
        `the state of deleted workspace ${payload.id}`,
      ),
    );
    return this.tail;
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
