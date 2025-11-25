import { BlockStateDto, WorkflowStateDto } from '../dtos';
import { BlockMetadata } from '@loopstack/common';
import type { BlockConfigType } from '@loopstack/contracts/types';
import {
  DocumentExecutionContextDto,
  FactoryExecutionContextDto,
  PipelineExecutionContextDto,
  ToolExecutionContextDto,
  WorkflowExecutionContextDto,
  WorkspaceExecutionContextDto,
} from '../dtos';
import { BlockRegistryItem } from '../services';

export type BlockContextType =
  | DocumentExecutionContextDto
  | WorkflowExecutionContextDto
  | ToolExecutionContextDto
  | PipelineExecutionContextDto
  | WorkspaceExecutionContextDto
  | FactoryExecutionContextDto;

export interface BlockInterface {
  processor: string;

  metadata: BlockMetadata;

  args: any;

  state: BlockStateDto | WorkflowStateDto;

  ctx: BlockContextType;

  config: BlockConfigType;

  init(registry: BlockRegistryItem, args: any, ctx: any): void;

  get name(): string;

  getResult(): any;
}
