export interface NamespaceCreateInterface {
  name: string;
  pipelineId: string;
  workspaceId: string;
  parent?: { id: string } | null;
  metadata?: Record<string, any>;
  createdBy: string;
}
