import { Logger, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileApiService } from '../file-api.service.js';
import type { FileSystemService } from '../file-system.service.js';

const ROOT = '/workspace/root';
const APP = 'my-app';

describe('FileApiService', () => {
  let fileSystem: {
    getWorkspaceRootPath: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    buildFileTree: ReturnType<typeof vi.fn>;
    validatePath: ReturnType<typeof vi.fn>;
    readFileContent: ReturnType<typeof vi.fn>;
  };
  let service: FileApiService;

  beforeEach(() => {
    fileSystem = {
      getWorkspaceRootPath: vi.fn().mockReturnValue(ROOT),
      exists: vi.fn().mockResolvedValue(true),
      buildFileTree: vi.fn(),
      validatePath: vi.fn().mockReturnValue(true),
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
      expect(fileSystem.readFileContent).toHaveBeenCalledWith(`${ROOT}/docs/readme.md`);
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
});
