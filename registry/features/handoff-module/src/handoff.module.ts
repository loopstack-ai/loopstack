import { type DynamicModule, Module } from '@nestjs/common';
import { registerFeature } from '@loopstack/common';

/**
 * NestJS module for the Studio `handoff` feature: a "Handoff" sidebar panel listing the run's `handoff`-tagged
 * documents (`HandoffDocument`, `ChangedFilesDocument`), plus the inline renderers for the `handoff` and
 * `changed-files` widgets in the run timeline.
 *
 * Registration:
 * - `HandoffModule.forFeature(config?: { enabled?: boolean })` — registers the `handoff` feature on the
 *   importing `@StudioApp`, which lights up the panel and the renderers. The panel's contents are per-run:
 *   workflows save hand-off documents via `documentStore.save(HandoffDocument, …)`.
 *
 * The document classes need no registration — import and save them. `TerminalHandoffDocument` is rendered by
 * the CLI's `terminal-handoff` widget and works without the Studio feature.
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
