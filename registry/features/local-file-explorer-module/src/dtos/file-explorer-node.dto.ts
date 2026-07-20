/**
 * Result representing a node in the local file tree — a file or folder with id, name, path, type, and
 * optional children.
 *
 * @public
 */
export class FileExplorerNodeDto {
  id!: string;

  name!: string;

  path!: string;

  type!: 'file' | 'folder';

  children?: FileExplorerNodeDto[];
}
