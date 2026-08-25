import { Injectable } from '@nestjs/common';
import type { Clock } from '@loopstack/common';

/** The production `Clock` — real wall time and real timers. */
@Injectable()
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  schedule(fn: () => void, ms: number): () => void {
    const timer = setTimeout(fn, ms);
    return () => clearTimeout(timer);
  }
}
