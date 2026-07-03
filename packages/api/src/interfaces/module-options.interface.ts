import type { CorsOptions } from 'cors';
import type { SseStreamOptionsInterface } from './sse-options.interface.js';

export interface ModuleOptionsInterface {
  connection?: string;
  /**
   * CORS configuration. Defaults to `{ origin: true, credentials: true }`.
   * Set to `false` to disable CORS entirely.
   */
  cors?: CorsOptions | false;
  /**
   * Event stream tuning — replay buffer size/TTL and heartbeat interval.
   */
  sse?: SseStreamOptionsInterface;
}
