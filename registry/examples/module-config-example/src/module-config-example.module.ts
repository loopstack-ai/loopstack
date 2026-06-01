import { Module } from '@nestjs/common';
import { DefaultGreetingModule } from './consumers/default-greeting.module.js';
import { FrenchGreetingModule } from './consumers/french-greeting.module.js';
import { GermanGreetingModule } from './consumers/german-greeting.module.js';
import { NestedGreetingModule } from './consumers/nested-greeting.module.js';
import { GreeterModule } from './greeter/index.js';

/**
 * Module Config Example — demonstrates 4 configuration scenarios:
 *
 * 1. DefaultGreetingModule  — no forFeature, uses forRoot global defaults (English)
 * 2. GermanGreetingModule   — forFeature override (German)
 * 3. FrenchGreetingModule   — forFeature override (French), proves per-module isolation
 * 4. NestedGreetingModule   — config passed through a wrapper module (Spanish via GreeterAgentModule)
 *
 * Usage in AppModule:
 *   imports: [
 *     GreeterModule.forRoot({ language: 'en', greeting: 'Hello' }),  // global default
 *     ModuleConfigExampleModule,
 *   ]
 *
 * Or without forRoot (empty defaults apply):
 *   imports: [ModuleConfigExampleModule]
 */
@Module({
  imports: [
    GreeterModule.forRoot({ language: 'en', greeting: 'Hello' }),
    DefaultGreetingModule,
    GermanGreetingModule,
    FrenchGreetingModule,
    NestedGreetingModule,
  ],
  exports: [DefaultGreetingModule, GermanGreetingModule, FrenchGreetingModule, NestedGreetingModule],
})
export class ModuleConfigExampleModule {}
