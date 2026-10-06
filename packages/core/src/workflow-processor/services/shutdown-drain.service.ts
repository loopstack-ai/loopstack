import { Injectable } from '@nestjs/common';

/**
 * Whether the process is shutting down and in-flight runs should yield.
 *
 * A stateful run executes its whole auto-transition chain inside one task, which for a polling loop or a
 * long agent session can last hours. Once draining has begun, the processor stops such a run at the next
 * transition boundary — the last transition's checkpoint is already committed — and queues a continuation
 * task, so the run carries on in whichever process picks the task up next instead of holding shutdown
 * hostage or being killed mid-transition.
 */
@Injectable()
export class ShutdownDrainService {
  private started = false;

  get draining(): boolean {
    return this.started;
  }

  begin(): void {
    this.started = true;
  }
}
