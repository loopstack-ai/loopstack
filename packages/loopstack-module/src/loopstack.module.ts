import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopstackApiModule } from '@loopstack/api';
import { AuthConfig } from '@loopstack/auth';
import { AppConfig, LoopCoreModule } from '@loopstack/core';
import { LoopstackModuleOptions } from './interfaces/index.js';

@Module({})
export class LoopstackModule {
  static forRoot(options: LoopstackModuleOptions = {}): DynamicModule {
    const imports: DynamicModule['imports'] = [];
    const connection = options.database?.connection;

    // Config
    imports.push(
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
        load: [buildAppConfig(options), buildAuthConfig(options)],
      }),
    );

    // TypeORM — register a connection unless the user provides an existing one via `connection`.
    if (!connection) {
      const db = options.database ?? {};
      imports.push(
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: db.host ?? process.env.DATABASE_HOST ?? 'localhost',
          port: db.port ?? (Number(process.env.DATABASE_PORT) || 5432),
          username: db.username ?? process.env.DATABASE_USERNAME ?? 'postgres',
          database: db.database ?? process.env.DATABASE_NAME ?? 'postgres',
          password: db.password ?? process.env.DATABASE_PASSWORD ?? 'admin',
          autoLoadEntities: true,
          synchronize: true,
          migrationsRun: false,
        }),
      );
    }

    // EventEmitter
    imports.push(EventEmitterModule.forRoot());

    // Core + API — thread connection name through all modules
    imports.push(LoopCoreModule.forRoot({ connection, redis: options.redis }));

    imports.push(
      LoopstackApiModule.register({
        availableEnvironments: options.availableEnvironments,
        connection,
        cors: options.cors,
      }),
    );

    return {
      module: LoopstackModule,
      imports,
      exports: [LoopstackApiModule, LoopCoreModule],
    };
  }
}

function buildAppConfig(options: LoopstackModuleOptions) {
  return registerAs<AppConfig>('app', () => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    enableAuth: options.enableAuth ?? process.env.LOOPSTACK_AUTH === 'true',
  }));
}

function buildAuthConfig(options: LoopstackModuleOptions) {
  const auth = options.auth;

  return registerAs<AuthConfig>('auth', () => ({
    jwt: {
      secret: auth?.jwt?.secret ?? process.env.JWT_SECRET ?? 'dev-secret-change-me',
      expiresIn: auth?.jwt?.expiresIn ?? process.env.JWT_EXPIRES_IN ?? '1h',
      refreshSecret:
        auth?.jwt?.refreshSecret ?? process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret-change-me',
      refreshExpiresIn: auth?.jwt?.refreshExpiresIn ?? process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    clientId: auth?.clientId ?? process.env.CLIENT_ID ?? 'local',
    hub: {
      issuer: auth?.hub?.issuer ?? process.env.HUB_ISSUER ?? 'https://hub.loopstack.ai',
      jwksUri: auth?.hub?.jwksUri ?? process.env.HUB_JWKS_URI ?? 'https://hub.loopstack.ai/.well-known/jwks.json',
    },
  }));
}
