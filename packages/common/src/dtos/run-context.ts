import { RunPayload } from '@loopstack/contracts/schemas';
import { WorkspaceEnvironmentContextDto } from './workspace-environment-context.dto';

export class RunContext {
  root!: string;
  userId!: string;
  pipelineId?: string;
  workspaceId!: string;
  workflowId?: string;
  labels!: string[];
  payload: RunPayload;
  pipelineContext?: Record<string, any>;
  workspaceEnvironments?: WorkspaceEnvironmentContextDto[];
  options: {
    stateless: boolean;
  };

  constructor(data: RunContext) {
    Object.assign(this, data);
  }
}
