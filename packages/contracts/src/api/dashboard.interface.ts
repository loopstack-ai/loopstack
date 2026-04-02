import { WorkflowInterface } from '../types/interfaces/workflow.interface.js';
import { WorkflowItemInterface } from './workflow.interface.js';

export interface DashboardStatsInterface {
  workspaceCount: number;
  totalAutomations: number;
  totalAutomationRuns: number;
  completedRuns: number;
  errorRuns: number;
  inProgressRuns: number;
  recentErrors: WorkflowInterface[];
  recentRuns: WorkflowItemInterface[];
}
