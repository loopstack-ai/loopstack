export interface StudioWidgetConfig {
  widget: string;
  options?: Record<string, unknown>;
}

export interface StudioUiConfig {
  widgets?: StudioWidgetConfig[];
}

export interface StudioEnvironmentSlot {
  id: string;
  title?: string;
  type?: string;
  optional?: boolean;
}

export interface StudioFeatureRegistration {
  id: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface StudioWorkflowConfig {
  workflowName: string;
  title?: string;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface StaticDocumentMeta {
  hidden?: boolean;
  mimeType?: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  enableAtPlaces?: string[];
  hideAtPlaces?: string[];
}

export interface StudioDocumentConfig {
  documentName: string;
  title?: string;
  description?: string;
  ui?: { widgets?: StudioWidgetConfig[] };
  tags?: string[];
  meta?: StaticDocumentMeta;
  schema?: Record<string, unknown>;
}

export interface StudioAppConfig {
  appName: string;
  title: string;
  description?: string;
  ui?: StudioUiConfig;
  features: StudioFeatureRegistration[];
  extensions?: Record<string, unknown[]>;
  workflows: StudioWorkflowConfig[];
  documents: StudioDocumentConfig[];
}

export interface WorkflowPayload<TArgs = Record<string, unknown>> {
  workspaceId: string;
  workflowId?: string;
  args?: TArgs;
  transition?: {
    id: string;
    payload?: Record<string, unknown>;
  };
}

export interface StartWorkflowPayload {
  workflowName: string;
  workspaceId: string;
  args?: Record<string, unknown>;
}

export interface WorkflowRunResult {
  workflowId: string;
  workspaceId: string;
  status: string;
}
