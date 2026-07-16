import type { CorsOptions } from 'cors';
import type { SseStreamOptionsInterface } from '@loopstack/api';

export interface LoopstackDatabaseOptions {
  /**
   * Reuse the host application's default TypeORM connection. When `true`,
   * LoopstackModule skips its own `TypeOrmModule.forRoot()` registration and all
   * internal repositories resolve against the default connection you registered.
   * That connection must point at a PostgreSQL database and load Loopstack's
   * entities (e.g. via `autoLoadEntities: true`).
   */
  reuseExistingConnection?: boolean;

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
   * Full CORS override. When set it is used verbatim (`false` disables CORS). When omitted, a safe
   * default is used that allows any localhost origin plus `corsOrigins`, with credentials enabled.
   */
  cors?: CorsOptions | false;
  /**
   * Extra allowed origins for the default CORS policy (in addition to localhost). Falls back to the
   * `CORS_ORIGINS` / `FRONTEND_URL` env vars. Ignored when `cors` is set.
   */
  corsOrigins?: string[];
  /**
   * Event stream tuning — replay buffer size/TTL and heartbeat interval.
   */
  sse?: SseStreamOptionsInterface;
}
