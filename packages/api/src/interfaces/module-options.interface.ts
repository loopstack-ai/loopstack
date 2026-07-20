import type { CorsOptions } from 'cors';
import type { SseStreamOptionsInterface } from './sse-options.interface.js';

/** DI token carrying the resolved CORS configuration for the request middleware. */
export const CORS_OPTIONS = 'loopstack.api.cors-options';

export interface ModuleOptionsInterface {
  /**
   * Full CORS override. When set it is used verbatim (an object is passed straight to the `cors`
   * middleware; `false` disables CORS entirely). When omitted, a safe default is built that allows
   * any localhost origin plus the origins in `corsOrigins`, with credentials enabled.
   */
  cors?: CorsOptions | false;
  /**
   * Extra allowed origins for the default CORS policy (in addition to localhost). Falls back to the
   * `CORS_ORIGINS` / `FRONTEND_URL` env vars (comma-separated). Ignored when `cors` is set.
   */
  corsOrigins?: string[];
  /**
   * Event stream tuning — replay buffer size/TTL and heartbeat interval.
   */
  sse?: SseStreamOptionsInterface;
}
