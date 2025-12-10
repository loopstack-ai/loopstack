import { WorkflowMetadataInterface } from './workflow-metadata.interface';

export interface WorkflowMementoData<TData> {
  data: Readonly<TData>;
  metadata: Readonly<WorkflowMetadataInterface>;
  step: string;
  timestamp: Date;
  version: number;
}