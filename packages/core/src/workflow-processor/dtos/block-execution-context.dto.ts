import { NamespaceEntity } from '@loopstack/common';
import type { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { WorkflowStateDto } from './workflow-state.dto';
import { Expose } from 'class-transformer';

abstract class BlockExecutionContextDto {
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
  namespace: NamespaceEntity;

  @Expose()
  labels: string[];

  @Expose()
  payload?: {
    transition?: TransitionPayloadInterface;
  };

  constructor(data: any) {
    Object.assign(this, data);
  }
}

export class RootExecutionContextDto extends BlockExecutionContextDto {
  constructor(data: RootExecutionContextDto) {
    super(data);
  }
}

export class PipelineExecutionContextDto extends BlockExecutionContextDto {
  constructor(data: PipelineExecutionContextDto) {
    super(data);
  }
}
export class WorkflowExecutionContextDto extends BlockExecutionContextDto {
  constructor(data: WorkflowExecutionContextDto) {
    super(data);
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

export class ToolExecutionContextDto extends BlockExecutionContextDto {
  workflow: WorkflowStateDto;

  constructor(data: ToolExecutionContextDto) {
    super(data);
    this.workflow = data.workflow;
  }
}
