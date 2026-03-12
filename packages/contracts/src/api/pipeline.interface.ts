import { PipelineState } from '../enums/pipeline-state.js';
import { SortByInterface } from './common.interface.js';

export interface PipelineContextInterface {
  [key: string]: any;
}

export interface PipelineInterface {
  id: string;
  blockName: string;
  title: string;
  run: number;
  labels: string[];
  order: number;
  status: PipelineState;
  context: PipelineContextInterface;
  schema: any;
  ui: any;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  parentId: string | null;
  hasChildren: number;
}

export interface PipelineItemInterface {
  id: string;
  blockName: string;
  title: string;
  run: number;
  labels: string[];
  order: number;
  status: PipelineState;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  parentId: string | null;
  hasChildren: number;
}

export interface PipelineCreateInterface {
  blockName: string;
  title: string | null;
  labels?: string[];
  workspaceId: string;
  transition: string | null;
  args: any;
  context?: Record<string, any>;
}

export interface PipelineUpdateInterface {
  title?: string;
  labels?: string[];
}

export interface PipelineSourceInterface {
  name: string;
  filePath: string | null;
  raw: string | null;
}

export interface PipelineFilterInterface {
  workspaceId?: string;
  parentId?: string | null;
  status?: string;
}

export type PipelineSortByInterface = SortByInterface;

export interface RunPipelinePayloadInterface {
  transition?: any;
}
