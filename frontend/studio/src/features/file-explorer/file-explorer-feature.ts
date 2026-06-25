import { Cloud, Files } from 'lucide-react';
import type { StudioFeature } from '@/features/feature-registry';
import { LocalFileExplorerPanel, RemoteFileExplorerPanel } from './components/FileExplorerPanel';

export const localFileExplorerFeature: StudioFeature = {
  id: 'local-file-explorer',
  sidebarPanel: {
    id: 'local-files',
    label: 'Files',
    icon: Files,
    component: LocalFileExplorerPanel,
  },
};

export const remoteFileExplorerFeature: StudioFeature = {
  id: 'remote-file-explorer',
  sidebarPanel: {
    id: 'remote-files',
    label: 'Remote Files',
    icon: Cloud,
    component: RemoteFileExplorerPanel,
  },
};
