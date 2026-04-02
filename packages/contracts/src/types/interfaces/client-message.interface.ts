export interface ClientMessageInterface {
  type: string;
  userId: string | null;
  workerId: string;
  id?: string;
  workflowId?: string;
  workspaceId?: string;
}
