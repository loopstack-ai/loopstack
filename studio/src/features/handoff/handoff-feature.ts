import type { StudioFeature } from '@/features/feature-registry';
import { ChangedFilesCard } from './ChangedFilesCard';
import { HandoffCommandCard } from './HandoffCommandCard';
import { TerminalHandoffCard } from './TerminalHandoffCard';

/**
 * The `handoff` feature — the inline renderers for `handoff`, `changed-files` and `terminal-handoff` documents
 * in the run timeline. Enabled when the backend app mounts it via `HandoffModule.forFeature()`
 * (`@loopstack/handoff`). The cards appear in the message context, next to the step that produced them.
 */
export const handoffFeature: StudioFeature = {
  id: 'handoff',
  documentRenderers: {
    handoff: HandoffCommandCard,
    'changed-files': ChangedFilesCard,
    'terminal-handoff': TerminalHandoffCard,
  },
};
