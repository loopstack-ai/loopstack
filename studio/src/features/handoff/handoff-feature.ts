// import { SquareTerminal } from 'lucide-react';
import type { StudioFeature } from '@/features/feature-registry';
import { ChangedFilesCard } from './ChangedFilesCard';
import { HandoffCommandCard } from './HandoffCommandCard';
// import { HandoffPanel } from './HandoffPanel';
import { TerminalHandoffCard } from './TerminalHandoffCard';

/**
 * The `handoff` feature — the inline renderers for `handoff`, `changed-files` and `terminal-handoff` documents
 * in the run timeline. Enabled when the backend app mounts it via `HandoffModule.forFeature()`
 * (`@loopstack/handoff`); its contents are the per-run `HandoffDocument`s workflows emit.
 *
 * The sidebar panel is disabled. It lists the hand-off documents of the open run only, and a run composed of
 * sub-workflows saves most of its cards inside those, where the panel of the opened run never sees them. The
 * cards are read in the message context instead, where they appear next to the step that produced them.
 */
export const handoffFeature: StudioFeature = {
  id: 'handoff',
  documentRenderers: {
    handoff: HandoffCommandCard,
    'changed-files': ChangedFilesCard,
    'terminal-handoff': TerminalHandoffCard,
  },
  // sidebarPanel: {
  //   id: 'handoff',
  //   label: 'Handoff',
  //   icon: SquareTerminal,
  //   component: HandoffPanel,
  // },
};
