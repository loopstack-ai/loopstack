import { WorkspaceLockService } from '../workspace-lock.service';

describe('WorkspaceLockService', () => {
  let service: WorkspaceLockService;

  beforeEach(() => {
    service = new WorkspaceLockService();
  });

  it('should acquire and release a lock', async () => {
    const release = await service.acquire('workspace-1');
    expect(typeof release).toBe('function');
    release();
  });

  it('should execute sequentially for the same workspace', async () => {
    const order: string[] = [];

    const task = async (id: string, delay: number) => {
      const release = await service.acquire('workspace-1');
      order.push(`${id}:start`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      order.push(`${id}:end`);
      release();
    };

    await Promise.all([task('A', 50), task('B', 10)]);

    // A acquired first, so B must wait for A to finish
    expect(order).toEqual(['A:start', 'A:end', 'B:start', 'B:end']);
  });

  it('should execute in parallel for different workspaces', async () => {
    const order: string[] = [];

    const task = async (id: string, workspace: string, delay: number) => {
      const release = await service.acquire(workspace);
      order.push(`${id}:start`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      order.push(`${id}:end`);
      release();
    };

    await Promise.all([task('A', 'workspace-1', 50), task('B', 'workspace-2', 10)]);

    // B is on a different workspace and is faster, so it finishes first
    expect(order).toEqual(['A:start', 'B:start', 'B:end', 'A:end']);
  });

  it('should serialize three tasks on the same workspace', async () => {
    const order: string[] = [];

    const task = async (id: string) => {
      const release = await service.acquire('workspace-1');
      order.push(`${id}:start`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push(`${id}:end`);
      release();
    };

    await Promise.all([task('A'), task('B'), task('C')]);

    expect(order).toEqual(['A:start', 'A:end', 'B:start', 'B:end', 'C:start', 'C:end']);
  });

  it('should allow a new task after previous tasks complete', async () => {
    const release1 = await service.acquire('workspace-1');
    release1();

    const release2 = await service.acquire('workspace-1');
    release2();

    // No deadlock, no error
    expect(true).toBe(true);
  });

  it('should release the lock even if the task throws', async () => {
    const order: string[] = [];

    const failingTask = async () => {
      const release = await service.acquire('workspace-1');
      try {
        order.push('failing:start');
        throw new Error('task failed');
      } finally {
        release();
      }
    };

    const successTask = async () => {
      const release = await service.acquire('workspace-1');
      order.push('success:start');
      order.push('success:end');
      release();
    };

    await Promise.allSettled([failingTask(), successTask()]);

    // Second task should still run after the first one fails and releases
    expect(order).toEqual(['failing:start', 'success:start', 'success:end']);
  });

  it('should handle mixed workspaces with correct isolation', async () => {
    const order: string[] = [];

    const task = async (id: string, workspace: string, delay: number) => {
      const release = await service.acquire(workspace);
      order.push(`${id}:start`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      order.push(`${id}:end`);
      release();
    };

    await Promise.all([
      task('A1', 'workspace-1', 50),
      task('A2', 'workspace-1', 10),
      task('B1', 'workspace-2', 30),
      task('B2', 'workspace-2', 10),
    ]);

    // workspace-1: A1 then A2 (sequential)
    const ws1Events = order.filter((e) => e.startsWith('A'));
    expect(ws1Events).toEqual(['A1:start', 'A1:end', 'A2:start', 'A2:end']);

    // workspace-2: B1 then B2 (sequential)
    const ws2Events = order.filter((e) => e.startsWith('B'));
    expect(ws2Events).toEqual(['B1:start', 'B1:end', 'B2:start', 'B2:end']);

    // But across workspaces, they overlap — A1 and B1 both start before either finishes
    const a1Start = order.indexOf('A1:start');
    const b1Start = order.indexOf('B1:start');
    const a1End = order.indexOf('A1:end');
    expect(b1Start).toBeLessThan(a1End);
    expect(a1Start).toBeLessThan(b1Start + 1); // both started early
  });
});
