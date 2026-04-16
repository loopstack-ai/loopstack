import { GitBranch } from 'lucide-react';
import type { StudioFeature } from '@/features/feature-registry';
import { WorkbenchGitPanel } from './components/WorkbenchGitPanel';

export const gitFeature: StudioFeature = {
  id: 'git',
  sidebarPanel: {
    id: 'git',
    label: 'Git',
    icon: GitBranch,
    component: WorkbenchGitPanel,
  },
};
