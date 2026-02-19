export type FileNodeType = 'file' | 'folder';

export interface FileExplorerNode {
  id: string;
  name: string;
  path: string;
  type: FileNodeType;
  children?: FileExplorerNode[];
}

export interface FileContent {
  path: string;
  content: string;
}
