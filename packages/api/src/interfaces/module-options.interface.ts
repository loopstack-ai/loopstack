import type { CorsOptions } from 'cors';

export interface ModuleOptionsInterface {
  connection?: string;
  /**
   * CORS configuration. Defaults to `{ origin: true, credentials: true }`.
   * Set to `false` to disable CORS entirely.
   */
  cors?: CorsOptions | false;
}
