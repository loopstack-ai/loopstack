export interface NamespaceCreateInterface {
  name: string;
  pipelineId: string;
  workspaceId: string;
  parent: any | null;
  metadata?: Record<string, any>;
  createdBy: string;
}
