import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileSystemService {
  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  createDirectory(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  copyRecursive(src: string, dest: string): void {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  resolvePath(basePath: string, relativePath: string): string {
    return path.resolve(basePath, relativePath);
  }

  findFiles(directory: string, pattern: RegExp): string[] {
    const results: string[] = [];

    if (!fs.existsSync(directory)) {
      return results;
    }

    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  getFileName(filePath: string): string {
    return path.basename(filePath);
  }

  relativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  dirname(filePath: string): string {
    return path.dirname(filePath);
  }
}
