import type { ComponentType } from 'react';
import type { DocumentRendererProps } from '@/features/documents/DocumentRenderer';

export interface StudioFeatureSidebarPanel {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType<{ workspaceId?: string }>;
}

export interface StudioFeature {
  id: string;
  documentRenderers?: Record<string, ComponentType<DocumentRendererProps>>;
  sidebarPanel?: StudioFeatureSidebarPanel;
}
