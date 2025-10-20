import { BlockStateDto } from '../dtos/workflow-state.dto';
import { BlockConfigType, BlockMetadata } from '@loopstack/shared';
import {
  DocumentExecutionContextDto, FactoryExecutionContextDto, PipelineExecutionContextDto,
  ToolExecutionContextDto,
  WorkflowExecutionContextDto, WorkspaceExecutionContextDto,
} from '../dtos/block-execution-context.dto';

export type BlockContextType = DocumentExecutionContextDto
  | WorkflowExecutionContextDto
  | ToolExecutionContextDto
  | PipelineExecutionContextDto
  | WorkspaceExecutionContextDto
  | FactoryExecutionContextDto;

export interface BlockInterface {
  processor: string;

  metadata: BlockMetadata;

  args: any;

  state: BlockStateDto;

  ctx: BlockContextType;

  config: BlockConfigType;

  init(metadata: BlockMetadata, args: any, ctx: any, data?: any): void;

  get name(): string;

  getResult(): any;
}