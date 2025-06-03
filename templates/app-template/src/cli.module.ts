import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopCoreModule } from '@loopstack/core';
import { LlmModule } from '@loopstack/llm';

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
      installTemplates: true,
    }),
    LlmModule,
  ],
  providers: [],
})
export class CliModule {}
