import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { LoopCoreModule } from '@loopstack/core';

export function createTestingModule(options: { imports: any[], providers: any[]}): TestingModuleBuilder {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
      LoopCoreModule,
      ...options.imports,
    ],
    providers: [
      ...options.providers,
    ]
  });
}
