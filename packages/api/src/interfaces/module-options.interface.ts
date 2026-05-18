import type { CorsOptions } from 'cors';
import type { AvailableEnvironmentInterface } from '@loopstack/contracts/api';

export interface ModuleOptionsInterface {
  availableEnvironments?: AvailableEnvironmentInterface[];
  connection?: string;
  /**
   * CORS configuration. Defaults to `{ origin: true, credentials: true }`.
   * Set to `false` to disable CORS entirely.
   */
  cors?: CorsOptions | false;
}
