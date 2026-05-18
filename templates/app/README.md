# Adding Loopstack to a vanilla NestJS app

This app was scaffolded with the NestJS CLI and then configured to use Loopstack. Here are the exact steps.

## 1. Scaffold a new NestJS project

```bash
npx @nestjs/cli new my-app --package-manager npm
cd my-app
```

## 2. Install dependencies

```bash
npm install @loopstack/loopstack-module
```

- `@loopstack/loopstack-module` brings in all Loopstack packages (core, api, auth, cli, pg driver)

## 3. Update `tsconfig.json`

The NestJS CLI generates `"module": "nodenext"` which is incompatible with Loopstack's CommonJS packages. Change it to:

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2023",
    "esModuleInterop": true,
    "declaration": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Key changes from the NestJS default:

- `"module": "CommonJS"` (was `"nodenext"`)
- `"moduleResolution"` removed (defaults to `"node"` with CommonJS)

## 4. Add `LoopstackModule` to `app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [LoopstackModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## 5. Start PostgreSQL and Redis

Loopstack requires a PostgreSQL database and Redis. The defaults expect:

- **PostgreSQL** on `localhost:5432` (user: `postgres`, password: `admin`, database: `postgres`)
- **Redis** on `localhost:6379`

Override via environment variables:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=admin
DATABASE_NAME=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 6. Run

```bash
npm run build
npm run start
```

The app starts with the full Loopstack stack: workflow engine, API endpoints, auth, and CLI commands.

## Configuration

`LoopstackModule.forRoot()` accepts an optional options object. Everything has sensible defaults and can be overridden via environment variables.

```ts
LoopstackModule.forRoot({
  // Database — all optional, falls back to env vars then defaults
  database: {
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'admin',
    database: 'postgres',
  },

  // Auth — JWT configuration
  auth: {
    jwt: {
      secret: 'my-secret',
      expiresIn: '1h',
      refreshSecret: 'my-refresh-secret',
      refreshExpiresIn: '7d',
    },
    clientId: 'local',
  },

  // Enable local development mode (bypasses hub auth)
  localMode: true,

  // CORS — defaults to { origin: true, credentials: true }
  // cors: { origin: 'https://myapp.com', credentials: true },
  // cors: false, // disable CORS entirely

  // Redis — all optional, falls back to env vars then defaults
  redis: {
    host: 'localhost',
    port: 6379,
    // password: 'my-password',
  },
});
```

### Using an existing TypeORM connection

If your AppModule already registers `TypeOrmModule.forRoot()`, you can tell Loopstack to reuse that connection instead of creating its own:

```ts
@Module({
  imports: [
    // Your own TypeORM connection (must be PostgreSQL)
    TypeOrmModule.forRoot({ type: 'postgres', ... }),

    // Reuse the default connection
    LoopstackModule.forRoot({ database: { connection: 'default' } }),
  ],
})
export class AppModule {}
```

You can also use a named connection:

```ts
@Module({
  imports: [
    TypeOrmModule.forRoot({ name: 'mydb', type: 'postgres', ... }),

    LoopstackModule.forRoot({ database: { connection: 'mydb' } }),
  ],
})
export class AppModule {}
```

## Known Issues / TODO

- **tsconfig incompatibility**: NestJS 11 defaults to `"module": "nodenext"` but Loopstack uses CommonJS. Migrating loopstack to ESM/nodenext would eliminate the tsconfig step entirely.
- **No production validation**: The old template's `loopstack.config.ts` threw an error if `CLIENT_ID` was missing in production. This validation was lost when config moved into the module. Consider adding startup validation for required production config.
