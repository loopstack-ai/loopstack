import { Module } from '@nestjs/common';
import { loadConfiguration, LoopCoreModule } from '@loopstack/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopstackApiModule } from '@loopstack/api';
import { LlmModule } from '@loopstack/llm';
import { AuthModule, JwtAuthGuard } from '@loopstack/auth';
import { authConfig } from './auth.config';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      database: 'postgres',
      password: 'admin',
      autoLoadEntities: true,
      synchronize: true,
    }),
    LoopCoreModule.forRoot({
      configs: loadConfiguration(__dirname + '/config'),
    }),
    AuthModule.forRoot(authConfig),
    LoopstackApiModule,
    LlmModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
