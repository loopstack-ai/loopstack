export class FileExplorerNodeDto {
  id!: string;

  name!: string;

  path!: string;

  type!: 'file' | 'folder';

  children?: FileExplorerNodeDto[];
}
