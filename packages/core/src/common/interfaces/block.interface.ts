import { WorkflowExecution } from '../../workflow-processor';
import {
  DocumentExecutionContextDto,
  FactoryExecutionContextDto,
  PipelineExecutionContextDto,
  WorkflowExecutionContextDto,
  WorkspaceExecutionContextDto,
} from '../dtos';

export type BlockContextType =
  | DocumentExecutionContextDto
  | WorkflowExecutionContextDto
  | PipelineExecutionContextDto
  | WorkspaceExecutionContextDto
  | FactoryExecutionContextDto;

export interface BlockInterface {
  type: string;

  get name(): string;

  getTemplateVars(args: unknown, ctx: WorkflowExecution): Record<string, unknown>;
}
