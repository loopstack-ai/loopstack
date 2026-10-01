import { Logger, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileApiService } from '../file-api.service.js';
import { FileSystemService } from '../file-system.service.js';

const ROOT = '/workspace/root';
const APP = 'my-app';

describe('FileApiService', () => {
  let fileSystem: {
    getWorkspaceRootPath: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    buildFileTree: ReturnType<typeof vi.fn>;
    validatePath: ReturnType<typeof vi.fn>;
    resolveContainedPath: ReturnType<typeof vi.fn>;
    readFileContent: ReturnType<typeof vi.fn>;
  };
  let service: FileApiService;

  beforeEach(() => {
    fileSystem = {
      getWorkspaceRootPath: vi.fn().mockReturnValue(ROOT),
      exists: vi.fn().mockResolvedValue(true),
      buildFileTree: vi.fn(),
      validatePath: vi.fn().mockReturnValue(true),
      resolveContainedPath: vi.fn((root: string, filePath: string) => Promise.resolve(path.join(root, filePath))),
      readFileContent: vi.fn(),
    };
    service = new FileApiService(fileSystem as unknown as FileSystemService);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFileTree', () => {
    it('returns the tree built from the workspace root', async () => {
      const tree = [{ id: 'a.txt', name: 'a.txt', path: 'a.txt', type: 'file' }];
      fileSystem.buildFileTree.mockResolvedValue(tree);

      expect(await service.getFileTree(APP)).toBe(tree);
      expect(fileSystem.exists).toHaveBeenCalledWith(ROOT);
      expect(fileSystem.buildFileTree).toHaveBeenCalledWith(ROOT);
    });

    it('returns an empty list and warns when the root does not exist', async () => {
      fileSystem.exists.mockResolvedValue(false);

      expect(await service.getFileTree(APP)).toEqual([]);
      expect(fileSystem.buildFileTree).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('getFileContent', () => {
    it('returns path and content for a plain file', async () => {
      fileSystem.readFileContent.mockResolvedValue('hello');

      expect(await service.getFileContent(APP, 'docs/readme.md')).toEqual({ path: 'docs/readme.md', content: 'hello' });
      expect(fileSystem.validatePath).toHaveBeenCalledWith(ROOT, `${ROOT}/docs/readme.md`);
      expect(fileSystem.exists).toHaveBeenCalledWith(`${ROOT}/docs/readme.md`);
      expect(fileSystem.resolveContainedPath).toHaveBeenCalledWith(ROOT, 'docs/readme.md');
      expect(fileSystem.readFileContent).toHaveBeenCalledWith(`${ROOT}/docs/readme.md`);
    });

    it('reads the resolved real path', async () => {
      fileSystem.resolveContainedPath.mockResolvedValue(`${ROOT}/real.md`);
      fileSystem.readFileContent.mockResolvedValue('hello');

      expect(await service.getFileContent(APP, 'alias.md')).toEqual({ path: 'alias.md', content: 'hello' });
      expect(fileSystem.readFileContent).toHaveBeenCalledWith(`${ROOT}/real.md`);
    });

    it('throws NotFoundException when the resolved path leaves the root', async () => {
      fileSystem.resolveContainedPath.mockResolvedValue(null);

      await expect(service.getFileContent(APP, 'link.txt')).rejects.toThrow(
        new NotFoundException('Invalid file path: link.txt'),
      );
      expect(fileSystem.readFileContent).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a path rejected by validation', async () => {
      fileSystem.validatePath.mockReturnValue(false);

      await expect(service.getFileContent(APP, '../secret')).rejects.toThrow(
        new NotFoundException('Invalid file path: ../secret'),
      );
      expect(fileSystem.validatePath).toHaveBeenCalledWith(ROOT, '/workspace/secret');
      expect(fileSystem.exists).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the file does not exist', async () => {
      fileSystem.exists.mockResolvedValue(false);

      await expect(service.getFileContent(APP, 'missing.txt')).rejects.toThrow(
        new NotFoundException('File not found: missing.txt'),
      );
      expect(fileSystem.readFileContent).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the file cannot be read', async () => {
      fileSystem.readFileContent.mockResolvedValue(null);

      await expect(service.getFileContent(APP, 'huge.bin')).rejects.toThrow(
        new NotFoundException('Could not read file: huge.bin'),
      );
    });

    it.each(['workflows/deploy.yaml', 'workflows/deploy.yml'])(
      'attaches workflowConfig for workflow YAML (%s)',
      async (filePath) => {
        fileSystem.readFileContent.mockResolvedValue(
          [
            'title: Deploy',
            'description: Ships it',
            'transitions:',
            '  - from: start',
            '    to: end',
            'ui:',
            '  widget: form',
            'schema:',
            '  type: object',
          ].join('\n'),
        );

        const result = await service.getFileContent(APP, filePath);

        expect(result.workflowConfig).toEqual({
          alias: 'deploy',
          title: 'Deploy',
          description: 'Ships it',
          transitions: [{ from: 'start', to: 'end' }],
          ui: { widget: 'form' },
          schema: { type: 'object' },
        });
      },
    );

    it('omits workflowConfig for YAML without a transitions array', async () => {
      fileSystem.readFileContent.mockResolvedValue('title: Config\ntransitions: nope\n');

      const result = await service.getFileContent(APP, 'config.yaml');

      expect(result).toEqual({ path: 'config.yaml', content: 'title: Config\ntransitions: nope\n' });
    });

    it('omits workflowConfig for scalar YAML', async () => {
      fileSystem.readFileContent.mockResolvedValue('just a string');

      expect((await service.getFileContent(APP, 'scalar.yml')).workflowConfig).toBeUndefined();
    });

    it('returns the raw content and logs at debug level for invalid YAML', async () => {
      const content = 'transitions: [unclosed';
      fileSystem.readFileContent.mockResolvedValue(content);

      expect(await service.getFileContent(APP, 'broken.yaml')).toEqual({ path: 'broken.yaml', content });
      expect(Logger.prototype.debug).toHaveBeenCalled();
    });

    it('does not parse non-YAML files', async () => {
      fileSystem.readFileContent.mockResolvedValue('{"transitions": []}');

      expect((await service.getFileContent(APP, 'workflow.json')).workflowConfig).toBeUndefined();
    });
  });

  describe('getFileContent with the real FileSystemService', () => {
    let base: string;
    let root: string;
    let realService: FileApiService;

    beforeEach(async () => {
      base = await fs.mkdtemp(path.join(os.tmpdir(), 'file-api-'));
      root = path.join(base, 'root');
      await fs.mkdir(root);
      await fs.writeFile(path.join(base, 'secret.txt'), 'SECRET OUTSIDE ROOT');
      await fs.mkdir(path.join(base, 'outside-dir'));
      await fs.writeFile(path.join(base, 'outside-dir', 'x.txt'), 'OUTSIDE DIR');
      const config = { get: vi.fn(() => root) } as unknown as ConfigService;
      realService = new FileApiService(new FileSystemService(config));
    });

    afterEach(async () => {
      await fs.rm(base, { recursive: true, force: true });
    });

    it('rejects a file symlink pointing outside the root', async () => {
      await fs.symlink('../secret.txt', path.join(root, 'link.txt'));

      await expect(realService.getFileContent(APP, 'link.txt')).rejects.toThrow(
        new NotFoundException('Invalid file path: link.txt'),
      );
    });

    it('rejects a path through a directory symlink pointing outside the root', async () => {
      await fs.symlink(path.join(base, 'outside-dir'), path.join(root, 'linked-dir'));

      await expect(realService.getFileContent(APP, 'linked-dir/x.txt')).rejects.toThrow(
        new NotFoundException('Invalid file path: linked-dir/x.txt'),
      );
    });

    it('reads a symlink whose target stays inside the root', async () => {
      await fs.writeFile(path.join(root, 'real.txt'), 'inside');
      await fs.symlink('real.txt', path.join(root, 'alias.txt'));

      expect(await realService.getFileContent(APP, 'alias.txt')).toEqual({ path: 'alias.txt', content: 'inside' });
    });

    it('reads files whose names start with two dots', async () => {
      await fs.writeFile(path.join(root, '..notes.md'), 'notes');
      await fs.mkdir(path.join(root, '..dir'));
      await fs.writeFile(path.join(root, '..dir', 'a.md'), 'a');

      expect(await realService.getFileContent(APP, '..notes.md')).toEqual({ path: '..notes.md', content: 'notes' });
      expect(await realService.getFileContent(APP, '..dir/a.md')).toEqual({ path: '..dir/a.md', content: 'a' });
    });

    it('still rejects lexical traversal and reports missing files', async () => {
      await expect(realService.getFileContent(APP, '../secret.txt')).rejects.toThrow(
        new NotFoundException('Invalid file path: ../secret.txt'),
      );
      await expect(realService.getFileContent(APP, 'missing.txt')).rejects.toThrow(
        new NotFoundException('File not found: missing.txt'),
      );
    });
  });
});
