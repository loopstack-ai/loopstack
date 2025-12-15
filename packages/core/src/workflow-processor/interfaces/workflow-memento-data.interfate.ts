import { WorkflowMetadataInterface } from './workflow-metadata.interface';

export interface WorkflowMementoData<TData> {
  data: Readonly<TData>;
  metadata: Readonly<WorkflowMetadataInterface>;
  timestamp: Date;
  version: number;
}