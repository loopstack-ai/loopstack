---
title: Custom Bootstrap
description: Advanced — replace LoopstackModule.forRoot() by wiring its underlying modules (ConfigModule, TypeOrmModule, EventEmitterModule, LoopCoreModule, LoopstackApiModule) yourself for granular control over database, config, and Nest bootstrap.
---

# Custom Bootstrap

`LoopstackModule.forRoot()` is the supported way to bootstrap a Loopstack app — it wires up config loading, TypeORM, the event emitter, the core engine, and the REST API in one call. For most apps you should use it as-is.

If you need finer-grained control — for example to reuse an existing TypeORM connection that has special pool settings, register a different `ConfigModule`, or co-locate Loopstack with another Nest framework — you can skip `LoopstackModule` and import its underlying modules directly. This is an advanced setup and you become responsible for reproducing the same wiring.

## What `LoopstackModule.forRoot()` Does

It registers these modules with sensible defaults:

- `ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', load: [...] })`
- `TypeOrmModule.forRoot({ type: 'postgres', autoLoadEntities: true, synchronize: true, ... })` — skipped when `database.reuseExistingConnection` is `true` (you register the default connection yourself)
- `EventEmitterModule.forRoot()`
- `LoopCoreModule.forRoot({ redis })` — the workflow engine
- `LoopstackApiModule.register({ cors })` — the REST API and controllers

See `loopstack/packages/loopstack-module/src/loopstack.module.ts` for the exact wiring.

## Bootstrapping Manually

To replace `LoopstackModule.forRoot()` with a custom setup, import these modules yourself:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopstackApiModule } from '@loopstack/api';
import { LoopCoreModule } from '@loopstack/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true /* your own config setup */ }),
    TypeOrmModule.forRoot({
      /* your own database setup, must point at PostgreSQL */
    }),
    EventEmitterModule.forRoot(),
    LoopCoreModule.forRoot({
      redis: {
        /* ... */
      },
    }),
    LoopstackApiModule.register({ cors: { origin: true, credentials: true } }),
  ],
})
export class AppModule {}
```

The app and auth configs that `LoopstackModule` loads (`app`, `auth` namespaces with the keys documented in [Configuration](../reference/configuration.md)) must also be provided — feed them in via your own `ConfigModule.forRoot({ load: [...] })`.

If you skip `LoopCoreModule.forRoot()` or `LoopstackApiModule.register()` your app will be missing the workflow engine or the REST API, respectively.
