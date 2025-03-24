import { ContextImportInterface } from './context-import.interface';

export interface WorkflowData {
  options?: Record<string, any>;
  imports?: Record<string, ContextImportInterface>
  data?: Record<string, any>;
}
