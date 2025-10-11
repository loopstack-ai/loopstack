import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  runStartupTasks: process.env.ENABLE_STARTUP_TASKS === 'true',
  isLocalMode: process.env.ENABLE_LOCAL_MODE === 'true',
}));

export const cliConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  runStartupTasks: false,
}));

export const authConfig = registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET ?? 'NO SECRET',
    expiresIn: '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'NO SECRET',
    refreshExpiresIn: '7d',
  },
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  authCallback: process.env.AUTH_CALLBACK_URL || "https://app.loopstack.ai/api/v1/sso/validate",
}));

export const databaseConfig = registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) || 5432 : 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  database: process.env.DATABASE_NAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'admin',
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production',
}));