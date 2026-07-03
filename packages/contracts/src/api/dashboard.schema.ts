import { z } from 'zod';
import { WorkflowItemSchema } from './workflow.schema.js';

export const DashboardStatsSchema = z.object({
  totalAutomationRuns: z.number(),
  completedRuns: z.number(),
  errorRuns: z.number(),
  inProgressRuns: z.number(),
  recentErrors: z.array(WorkflowItemSchema),
  recentRuns: z.array(WorkflowItemSchema),
});
export type DashboardStatsInterface = z.infer<typeof DashboardStatsSchema>;
