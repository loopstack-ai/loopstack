import { KeyRound } from 'lucide-react';
import type { StudioFeature } from '@/features/feature-registry';
import { WorkbenchSecretsPanel } from './components/WorkbenchSecretsPanel';
import SecretInputRenderer from './renderers/SecretInputRenderer';

export const secretsFeature: StudioFeature = {
  id: 'secrets',
  documentRenderers: {
    'secret-input': SecretInputRenderer,
  },
  sidebarPanel: {
    id: 'secrets',
    label: 'Environment Secrets',
    icon: KeyRound,
    component: WorkbenchSecretsPanel,
  },
};
