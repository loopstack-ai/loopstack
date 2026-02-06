import type { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { NamespaceEntity } from '../entities';
import { BlockStateDto, WorkflowStateDto } from './workflow-state.dto';

export class BlockExecutionContextDto<TState extends WorkflowStateDto | BlockStateDto = BlockStateDto> {
  root!: string;
  index!: string;
  userId!: string;
  pipelineId!: string;
  workspaceId!: string;
  workflowId?: string;
  namespace!: NamespaceEntity;
  labels!: string[];
  payload?: {
    transition?: TransitionPayloadInterface;
  };

  state!: TState;

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
