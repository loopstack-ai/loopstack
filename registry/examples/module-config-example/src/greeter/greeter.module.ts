import { DynamicModule, Global, Module } from '@nestjs/common';
import { GREETER_CONFIG } from './greeter.constants.js';
import type { GreeterConfig } from './greeter.constants.js';
import { GreeterTool } from './greeter.tool.js';

const DEFAULT_CONFIG: GreeterConfig = {};
const TOOLS = [GreeterTool];

/**
 * Internal global root module — provides the default GreeterTool globally.
 * Separate class so NestJS doesn't deduplicate it with forFeature() imports.
 */
@Global()
@Module({
  providers: [{ provide: GREETER_CONFIG, useValue: DEFAULT_CONFIG }, ...TOOLS],
  exports: [GREETER_CONFIG, ...TOOLS],
})
class GreeterRootModule {}

/**
 * Configurable Greeter Module — demonstrates the forRoot/forFeature pattern.
 *
 * - `forRoot(config)` — sets the global default config (call once in root AppModule)
 * - `forFeature(config)` — overrides config for a specific module's tools
 *
 * If neither is called, the global root module provides empty defaults.
 * forFeature automatically ensures the global root module is available.
 */
@Module({})
export class GreeterModule {
  static forRoot(config: GreeterConfig): DynamicModule {
    return {
      module: GreeterRootModule,
      global: true,
      providers: [{ provide: GREETER_CONFIG, useValue: config }, ...TOOLS],
      exports: [GREETER_CONFIG, ...TOOLS],
    };
  }

  static forFeature(config: GreeterConfig): DynamicModule {
    return {
      module: GreeterModule,
      imports: [GreeterRootModule],
      providers: [{ provide: GREETER_CONFIG, useValue: config }, ...TOOLS],
      exports: [...TOOLS],
    };
  }
}
