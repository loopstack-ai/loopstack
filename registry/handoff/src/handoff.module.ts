import { type DynamicModule, Module } from '@nestjs/common';
import { registerFeature } from '@loopstack/common';

/**
 * NestJS module for the Studio `handoff` feature: the inline renderers for the `handoff`, `changed-files` and
 * `terminal-handoff` widgets in the run timeline.
 *
 * Registration:
 * - `HandoffModule.forFeature(config?: { enabled?: boolean })` — registers the `handoff` feature on the
 *   importing `@StudioApp`, which lights up the renderers. Workflows save the documents via
 *   `documentStore.save(HandoffDocument, …)`.
 *
 * The document classes need no registration — import and save them. `TerminalHandoffDocument` is also driven
 * by the CLI's `terminal-handoff` widget, which needs no feature.
 *
 * @public
 */
@Module({})
export class HandoffModule {
  static forFeature(config?: { enabled?: boolean }): DynamicModule {
    return {
      module: HandoffModule,
      providers: [registerFeature('handoff', config)],
    };
  }
}
