import { Module } from '@nestjs/common';
import { TypeSafeClientService } from './services/index.js';
import { TypeSafeSystemOneTool } from './tools/index.js';

/**
 * NestJS module that provides the `TypeSafeSystemOneTool` (`typesafe_system_one`) and the `TypeSafeClientService`
 * for typed yes/no, choice and score decisions with TypeSafe AI.
 *
 * Registration:
 * - `TypeSafeModule` — bare import is all that is needed; there are no static methods.
 *
 * Requires: a TypeSafe API key, read from the `TYPESAFE_API_KEY` env var by default (override the env var name per
 * call via `envApiKey`). The model defaults to `TYPESAFE_DEFAULT_MODEL`, then `jev-latest`.
 *
 * @public
 */
@Module({
  providers: [TypeSafeClientService, TypeSafeSystemOneTool],
  exports: [TypeSafeClientService, TypeSafeSystemOneTool],
})
export class TypeSafeModule {}
