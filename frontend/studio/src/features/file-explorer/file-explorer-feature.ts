import { Files } from 'lucide-react';
import type { StudioFeature } from '@/features/feature-registry';
import { FileExplorerPanel } from './components/FileExplorerPanel';

export const fileExplorerFeature: StudioFeature = {
  id: 'file-explorer',
  sidebarPanel: {
    id: 'files',
    label: 'Files',
    icon: Files,
    component: FileExplorerPanel,
  },
};
