import { ServiceWithSchemaInterface } from './service-with-schema.interface';
import { DocumentEntity, WorkflowEntity } from '../../persistence/entities';
import { ContextInterface } from './context.interface';
import { WorkflowData } from './workflow-data.interface';
import { DocumentCreateInterface } from '../../persistence/interfaces/document-create.interface';

export interface ToolApplicationInfo {
  transition?: string;
  payload?: any;
}

export interface ToolExecutionResult {
  context?: ContextInterface,
  workflow?: WorkflowEntity;
  data?: WorkflowData;
  info?: any;
  documents?: DocumentEntity[];
}

export interface ToolResult {
  context?: ContextInterface,
  workflow?: WorkflowEntity;
  data?: WorkflowData;
  info?: any;
  documents?: DocumentCreateInterface[];
}

export interface ToolInterface extends ServiceWithSchemaInterface{
  apply(
    props: any,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    data: WorkflowData | undefined,
    info: ToolApplicationInfo,
  ): Promise<ToolResult>;
}
