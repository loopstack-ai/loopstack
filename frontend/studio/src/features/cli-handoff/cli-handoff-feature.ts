import { SquareTerminal } from 'lucide-react';
import type { StudioFeature } from '@/features/feature-registry';
import { CliHandoffPanel } from './CliHandoffPanel';

/**
 * The `cliHandoff` feature — a sidebar panel of prepared `loopstack …` commands for the run in view.
 * Enabled when the backend app registers it via `CodeWorkspaceModule.forFeature({ commands })`.
 */
export const cliHandoffFeature: StudioFeature = {
  id: 'cliHandoff',
  sidebarPanel: {
    id: 'cli-handoff',
    label: 'CLI handoff',
    icon: SquareTerminal,
    component: CliHandoffPanel,
  },
};
