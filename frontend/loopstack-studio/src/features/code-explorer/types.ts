export interface FileExplorerNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileExplorerNode[];
  path?: string;
}
