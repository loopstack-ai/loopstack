import { PipelineConfigInterface } from '../types/interfaces/pipeline-config.interface.js';

export interface FileExplorerNodeInterface {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileExplorerNodeInterface[];
}

export interface FileContentInterface {
  path: string;
  content: string;
  workflowConfig?: PipelineConfigInterface;
}
