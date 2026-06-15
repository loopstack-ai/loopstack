export interface ClientMessageInterface {
  type: string;
  userId: string | null;
  workerId: string;
  id?: string;
  workflowId?: string;
  parentId?: string;
  workspaceId?: string;
  [key: string]: unknown;
}
