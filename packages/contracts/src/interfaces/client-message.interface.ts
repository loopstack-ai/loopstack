export interface ClientMessageInterface {
  type: string;
  userId: string | null;
  workerId: string;
  id?: string;
  namespaceId?: string;
  workflowId?: string;
  pipelineId?: string;
  workspaceId?: string;
}