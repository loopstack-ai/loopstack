import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileSystemService } from '../file-system.service.js';

function makeService(basePath?: string): FileSystemService {
  const config = {
    get: vi.fn((key: string, defaultValue?: string) => (key === 'WORKSPACE_BASE_PATH' && basePath) || defaultValue),
  } as unknown as ConfigService;
  return new FileSystemService(config);
}

async function write(root: string, relativePath: string, content = ''): Promise<void> {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
}

describe('FileSystemService', () => {
  let root: string;
  let service: FileSystemService;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-service-'));
    service = makeService(root);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  describe('getWorkspaceRootPath', () => {
    it('returns the normalized WORKSPACE_BASE_PATH', () => {
      expect(makeService(`${root}/sub/../`).getWorkspaceRootPath()).toBe(`${root}/`);
      expect(service.getWorkspaceRootPath()).toBe(root);
    });

    it('defaults to process.cwd() when WORKSPACE_BASE_PATH is not set', () => {
      expect(makeService().getWorkspaceRootPath()).toBe(process.cwd());
    });
  });

  describe('validatePath', () => {
    it('accepts the root itself and paths inside it', () => {
      expect(service.validatePath(root, root)).toBe(true);
      expect(service.validatePath(root, path.join(root, 'a.txt'))).toBe(true);
      expect(service.validatePath(root, path.join(root, 'nested', 'deep', 'b.txt'))).toBe(true);
    });

    it('accepts paths that leave and re-enter the root', () => {
      expect(service.validatePath(root, path.join(root, 'nested', '..', 'a.txt'))).toBe(true);
    });

    it('rejects traversal out of the root', () => {
      expect(service.validatePath(root, path.join(root, '..'))).toBe(false);
      expect(service.validatePath(root, path.join(root, '..', 'outside.txt'))).toBe(false);
      expect(service.validatePath(root, path.join(root, 'nested', '..', '..', 'etc', 'passwd'))).toBe(false);
    });

    it('rejects an absolute path outside the root', () => {
      expect(service.validatePath(root, '/etc/passwd')).toBe(false);
    });

    it('rejects a sibling directory sharing the root as a name prefix', () => {
      expect(service.validatePath(root, `${root}-sibling/file.txt`)).toBe(false);
    });
  });

  describe('buildFileTree', () => {
    it('returns folders before files, each sorted by name, with relative paths as ids', async () => {
      await write(root, 'b.txt');
      await write(root, 'a.txt');
      await write(root, 'src/index.ts');
      await write(root, 'docs/guide.md');

      const tree = await service.buildFileTree(root);

      expect(tree).toEqual([
        {
          id: 'docs',
          name: 'docs',
          path: 'docs',
          type: 'folder',
          children: [{ id: 'docs/guide.md', name: 'guide.md', path: 'docs/guide.md', type: 'file' }],
        },
        {
          id: 'src',
          name: 'src',
          path: 'src',
          type: 'folder',
          children: [{ id: 'src/index.ts', name: 'index.ts', path: 'src/index.ts', type: 'file' }],
        },
        { id: 'a.txt', name: 'a.txt', path: 'a.txt', type: 'file' },
        { id: 'b.txt', name: 'b.txt', path: 'b.txt', type: 'file' },
      ]);
    });

    it('omits children for empty folders', async () => {
      await fs.mkdir(path.join(root, 'empty'));

      expect(await service.buildFileTree(root)).toEqual([
        { id: 'empty', name: 'empty', path: 'empty', type: 'folder', children: undefined },
      ]);
    });

    it('skips dotfiles and ignored directories', async () => {
      await write(root, '.env', 'SECRET=1');
      await write(root, '.git/HEAD');
      await write(root, 'node_modules/pkg/index.js');
      await write(root, 'dist/index.js');
      await write(root, 'build/out.js');
      await write(root, 'keep.ts');

      const tree = await service.buildFileTree(root);

      expect(tree.map((n) => n.name)).toEqual(['keep.ts']);
    });

    it('builds a subtree when given a relative path', async () => {
      await write(root, 'src/lib/util.ts');
      await write(root, 'other.ts');

      expect(await service.buildFileTree(root, 'src')).toEqual([
        {
          id: 'src/lib',
          name: 'lib',
          path: 'src/lib',
          type: 'folder',
          children: [{ id: 'src/lib/util.ts', name: 'util.ts', path: 'src/lib/util.ts', type: 'file' }],
        },
      ]);
    });

    it('does not list symlinks', async () => {
      const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-service-outside-'));
      try {
        await write(outside, 'secret.txt', 'secret');
        await fs.symlink(outside, path.join(root, 'link-dir'));
        await fs.symlink(path.join(outside, 'secret.txt'), path.join(root, 'link-file'));

        expect(await service.buildFileTree(root)).toEqual([]);
      } finally {
        await fs.rm(outside, { recursive: true, force: true });
      }
    });

    it('returns an empty list and logs when the directory cannot be read', async () => {
      const tree = await service.buildFileTree(path.join(root, 'missing'));

      expect(tree).toEqual([]);
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('readFileContent', () => {
    it('reads a file as utf-8', async () => {
      await write(root, 'hello.txt', 'héllo');

      expect(await service.readFileContent(path.join(root, 'hello.txt'))).toBe('héllo');
    });

    it('reads a file exactly at the size limit', async () => {
      await write(root, 'exact.txt', '12345');

      expect(await service.readFileContent(path.join(root, 'exact.txt'), 5)).toBe('12345');
    });

    it('returns null and warns for a file over the size limit', async () => {
      await write(root, 'big.txt', '123456');

      expect(await service.readFileContent(path.join(root, 'big.txt'), 5)).toBeNull();
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('returns null for a directory', async () => {
      await fs.mkdir(path.join(root, 'dir'));

      expect(await service.readFileContent(path.join(root, 'dir'))).toBeNull();
    });

    it('returns null and logs for a missing file', async () => {
      expect(await service.readFileContent(path.join(root, 'missing.txt'))).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('is true for existing files and directories', async () => {
      await write(root, 'a.txt');

      expect(await service.exists(path.join(root, 'a.txt'))).toBe(true);
      expect(await service.exists(root)).toBe(true);
    });

    it('is false for a missing path', async () => {
      expect(await service.exists(path.join(root, 'missing'))).toBe(false);
    });
  });
});
