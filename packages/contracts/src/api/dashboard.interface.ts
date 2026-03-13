import { WorkflowInterface } from '../types/interfaces/workflow.interface.js';
import { PipelineInterface } from './pipeline.interface.js';

export interface DashboardStatsInterface {
  workspaceCount: number;
  totalAutomations: number;
  totalAutomationRuns: number;
  completedRuns: number;
  errorRuns: number;
  inProgressRuns: number;
  recentErrors: WorkflowInterface[];
  recentRuns: PipelineInterface[];
}
