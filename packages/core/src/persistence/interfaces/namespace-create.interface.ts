export interface NamespaceCreateInterface {
  name: string;
  projectId: string;
  workspaceId: string;
  model: string;
  parentId?: string;
  metadata?: Record<string, any>;
}
