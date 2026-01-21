import { NamespaceEntity } from '@loopstack/common';
import type { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { BlockStateDto, WorkflowStateDto } from './workflow-state.dto';
import { Expose } from 'class-transformer';

export class BlockExecutionContextDto<TState extends WorkflowStateDto | BlockStateDto = BlockStateDto> {
  @Expose()
  root: string;

  @Expose()
  index: string;

  @Expose()
  userId: string;

  @Expose()
  pipelineId: string;

  @Expose()
  workspaceId: string;

  @Expose()
  workflowId?: string;

  @Expose()
  namespace: NamespaceEntity;

  @Expose()
  labels: string[];

  @Expose()
  payload?: {
    transition?: TransitionPayloadInterface;
  };

  state: TState;

  constructor(data: any) {
    Object.assign(this, data);
  }
}

export class RootExecutionContextDto extends BlockExecutionContextDto {
  constructor(data: Omit<RootExecutionContextDto, 'setState'>) {
    super(data);
  }
}

export class PipelineExecutionContextDto extends BlockExecutionContextDto {
  constructor(data: PipelineExecutionContextDto) {
    super(data);
  }
}
export class WorkflowExecutionContextDto extends BlockExecutionContextDto<WorkflowStateDto> {

  state: WorkflowStateDto;

  constructor(data: WorkflowExecutionContextDto) {
    super(data);
    this.state = data.state;
  }
}
export class FactoryExecutionContextDto extends BlockExecutionContextDto {
  constructor(data: FactoryExecutionContextDto) {
    super(data);
  }
}
export class WorkspaceExecutionContextDto extends BlockExecutionContextDto {
  constructor(data: WorkspaceExecutionContextDto) {
    super(data);
  }
}
export class DocumentExecutionContextDto extends BlockExecutionContextDto {
  constructor(data: DocumentExecutionContextDto) {
    super(data);
  }
}