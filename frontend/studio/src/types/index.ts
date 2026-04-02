export interface Environment {
  id: string;
  name: string;
  url: string;
  getIdToken?: () => Promise<string>;
}

export interface StudioRouter {
  navigateToHome(): Promise<void>;
  getEnvironmentInfo(): string;
  navigateToEnvironmentInfo(): Promise<void>;
  getRuns(): string;
  getRunsActionRequired(): string;
  getDashboard(): string;
  navigateToDashboard(): Promise<void>;
  getWorkspaces(): string;
  getDebugWorkflows(): string;
  getDebugWorkflow(workflowId: string): string;
  navigateToDebugWorkflow(workflowId: string): Promise<void>;
  navigateToWorkspaces(): Promise<void>;
  getWorkspace(workspaceId: string): string;
  navigateToWorkspace(workspaceId: string): Promise<void>;
  getWorkflow(workflowId: string): string;
  navigateToWorkflow(workflowId: string): Promise<void>;
  getWorkflowDebug(workflowId: string): string;
  navigateToWorkflowDebug(workflowId: string): Promise<void>;
  navigateToChildWorkflow(workflowId: string, clickId: string | undefined): Promise<void>;
  getWorkspaceRuns(workspaceId: string): string;
  navigateToWorkspaceRuns(workspaceId: string): Promise<void>;
  getEmbedWorkflow(workflowId: string): string;
  getPreviewWorkflow(workflowId: string): string;
  getCurrentEnvironmentId(): string;
  getTheme(): 'local' | 'cloud';
}
