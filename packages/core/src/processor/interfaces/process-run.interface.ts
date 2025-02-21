export interface ProcessRunInterface {
  userId: string;
  projectId: string;
  workspaceId: string;

  config: {
    projectName: string;
  };
}
