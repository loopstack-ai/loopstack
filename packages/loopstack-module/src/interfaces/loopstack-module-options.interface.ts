import type { CorsOptions } from 'cors';

export interface LoopstackDatabaseOptions {
  /**
   * Reuse an existing TypeORM connection by name. When set, LoopstackModule
   * skips TypeORM.forRoot() registration and all internal modules use
   * the specified connection. The connection must point at a PostgreSQL database.
   */
  connection?: string;

  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface LoopstackAuthOptions {
  jwt?: {
    secret?: string;
    expiresIn?: string;
    refreshSecret?: string;
    refreshExpiresIn?: string;
  };
  clientId?: string;
  hub?: {
    issuer?: string;
    jwksUri?: string;
  };
}

export interface LoopstackRedisOptions {
  host?: string;
  port?: number;
  password?: string;
}

export interface LoopstackModuleOptions {
  database?: LoopstackDatabaseOptions;
  auth?: LoopstackAuthOptions;
  redis?: LoopstackRedisOptions;
  enableAuth?: boolean;
  /**
   * CORS configuration. Defaults to `{ origin: true, credentials: true }`.
   * Set to `false` to disable CORS entirely.
   */
  cors?: CorsOptions | false;
}
