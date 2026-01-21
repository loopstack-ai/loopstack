import type {
  BlockConfigType,
} from '@loopstack/contracts/types';
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

  // metadata: BlockMetadata;

  config: BlockConfigType;

  tools: string[];

  workflows: string[];

  helpers: string[];

  get name(): string;
}
