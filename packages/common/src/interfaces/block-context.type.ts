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
