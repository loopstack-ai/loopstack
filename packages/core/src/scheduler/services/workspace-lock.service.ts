import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceLockService {
  private readonly locks = new Map<string, Promise<void>>();

  async acquire(workspaceId: string): Promise<() => void> {
    const previous = this.locks.get(workspaceId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(
      workspaceId,
      previous.then(() => current),
    );
    await previous;
    return release;
  }
}
