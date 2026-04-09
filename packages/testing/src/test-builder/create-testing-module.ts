import { DynamicModule, ForwardReference, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { LoopCoreModule } from '@loopstack/core';
import { MockDataSourceModule } from './core-module-mock';

type ModuleImport = Type | DynamicModule | Promise<DynamicModule> | ForwardReference;

export function createTestingModule(options: { imports: ModuleImport[]; providers: Provider[] }): TestingModuleBuilder {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
      MockDataSourceModule,
      LoopCoreModule,
      ...options.imports,
    ],
    providers: [...options.providers],
  });
}
