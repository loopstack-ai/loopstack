import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileExplorerNodeDto } from '../dtos/file-tree.dto';

@Injectable()
export class FileSystemService {
  private readonly logger = new Logger(FileSystemService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Get the workspace root path for a given workspace
   * Defaults to process.cwd()/src if WORKSPACE_BASE_PATH is not set
   */
  getWorkspaceRootPath(_workspaceId: string): string {
    const basePath = this.configService.get<string>('WORKSPACE_BASE_PATH', process.cwd());
    const workspacePath = path.join(basePath, 'src');
    return workspacePath;
  }

  /**
   * Validate that a target path is within the base path (prevent directory traversal)
   */
  validatePath(basePath: string, targetPath: string): boolean {
    const normalizedBasePath = path.normalize(basePath);
    const normalizedTargetPath = path.normalize(targetPath);
    const relativePath = path.relative(normalizedBasePath, normalizedTargetPath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return false;
    }

    return true;
  }

  /**
   * Build a file tree structure from a directory
   */
  async buildFileTree(rootPath: string, relativePath: string = ''): Promise<FileExplorerNodeDto[]> {
    const fullPath = relativePath ? path.join(rootPath, relativePath) : rootPath;

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const nodes: FileExplorerNodeDto[] = [];

      for (const entry of entries) {
        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith('.') || this.shouldIgnore(entry.name)) {
          continue;
        }

        const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;
        if (entry.isDirectory()) {
          const children = await this.buildFileTree(rootPath, entryRelativePath);
          nodes.push({
            id: entryRelativePath,
            name: entry.name,
            path: entryRelativePath,
            type: 'folder',
            children: children.length > 0 ? children : undefined,
          });
        } else if (entry.isFile()) {
          nodes.push({
            id: entryRelativePath,
            name: entry.name,
            path: entryRelativePath,
            type: 'file',
          });
        }
      }

      // Sort: folders first, then files, both alphabetically
      return nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      this.logger.error(`Error building file tree for ${fullPath}:`, error);
      return [];
    }
  }

  /**
   * Read file content
   */
  async readFileContent(filePath: string, maxSize: number = 10 * 1024 * 1024): Promise<string | null> {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return null;
      }

      if (stats.size > maxSize) {
        this.logger.warn(`File ${filePath} exceeds max size of ${maxSize} bytes`);
        return null;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      this.logger.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a path should be ignored
   */
  private shouldIgnore(name: string): boolean {
    const ignorePatterns = ['node_modules', '.git', '.next', '.nuxt', 'dist', 'build', '.cache', '.turbo'];
    return ignorePatterns.includes(name);
  }
}
