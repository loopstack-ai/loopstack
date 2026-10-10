import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import type { FileExplorerNodeDto } from '../dtos/file-explorer-node.dto.js';

/**
 * Service that performs path-safe local filesystem access — resolves the workspace root, builds the file
 * tree, reads file contents, and guards against directory traversal; inject it for programmatic file access.
 *
 * @providedBy LocalFileExplorerModule
 * @public
 */
@Injectable()
export class FileSystemService {
  private readonly logger = new Logger(FileSystemService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Get the workspace root path.
   * Defaults to process.cwd() if WORKSPACE_BASE_PATH is not set.
   */
  getWorkspaceRootPath(): string {
    const basePath = this.configService.get<string>('WORKSPACE_BASE_PATH', process.cwd());
    return path.join(basePath);
  }

  /**
   * Validate that a target path is within the base path (prevent directory traversal).
   * This is a lexical check on the path strings and does not follow symlinks — use
   * `resolveContainedPath` before reading a file.
   */
  validatePath(basePath: string, targetPath: string): boolean {
    return this.isWithin(path.normalize(basePath), path.normalize(targetPath));
  }

  /**
   * Resolve a path relative to the base path to its real location, following symlinks.
   * Returns the real path if it lies within the real base path, or null if it lies outside
   * or either path cannot be resolved.
   */
  async resolveContainedPath(basePath: string, relativePath: string): Promise<string | null> {
    try {
      const realBasePath = await fs.realpath(basePath);
      const realTargetPath = await fs.realpath(path.join(basePath, relativePath));
      return this.isWithin(realBasePath, realTargetPath) ? realTargetPath : null;
    } catch {
      return null;
    }
  }

  /**
   * Build a file tree structure from a directory.
   */
  async buildFileTree(rootPath: string, relativePath: string = ''): Promise<FileExplorerNodeDto[]> {
    const fullPath = relativePath ? path.join(rootPath, relativePath) : rootPath;

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const nodes: FileExplorerNodeDto[] = [];

      for (const entry of entries) {
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
   * Read file content.
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

      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      this.logger.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if a file or directory exists.
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private isWithin(basePath: string, targetPath: string): boolean {
    const relativePath = path.relative(basePath, targetPath);
    return relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
  }

  private shouldIgnore(name: string): boolean {
    const ignorePatterns = ['node_modules', '.git', '.next', '.nuxt', 'dist', 'build', '.cache', '.turbo'];
    return ignorePatterns.includes(name);
  }
}
