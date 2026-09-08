import { SquareTerminal } from 'lucide-react';
import type { StudioFeature } from '@/features/feature-registry';
import { ChangedFilesCard } from './ChangedFilesCard';
import { HandoffCommandCard } from './HandoffCommandCard';
import { HandoffPanel } from './HandoffPanel';

/**
 * The `handoff` feature — a sidebar panel of the run's prepared hand-off commands (open in IDE, continue in
 * terminal, …), plus the inline renderer for `handoff` documents in the run timeline. Enabled when the
 * backend app mounts it via `CodeWorkspaceModule.forFeature()`; its contents are the per-run
 * `HandoffDocument`s workflows emit.
 */
export const handoffFeature: StudioFeature = {
  id: 'handoff',
  documentRenderers: {
    handoff: HandoffCommandCard,
    'changed-files': ChangedFilesCard,
  },
  sidebarPanel: {
    id: 'handoff',
    label: 'Handoff',
    icon: SquareTerminal,
    component: HandoffPanel,
  },
};
