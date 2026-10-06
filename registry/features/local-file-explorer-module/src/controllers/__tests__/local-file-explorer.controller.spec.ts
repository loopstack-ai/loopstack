import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUserInterface } from '@loopstack/common';
import { WorkspaceService } from '@loopstack/core';
import { FileApiService } from '../../services/file-api.service.js';
import { LocalFileExplorerController } from '../local-file-explorer.controller.js';

const WORKSPACE_ID = 'ws-1';
const user = { userId: 'user-1' } as CurrentUserInterface;

describe('LocalFileExplorerController', () => {
  let controller: LocalFileExplorerController;
  let workspaceService: { getWorkspace: ReturnType<typeof vi.fn> };
  let fileApi: { getFileTree: ReturnType<typeof vi.fn>; getFileContent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    workspaceService = { getWorkspace: vi.fn().mockResolvedValue({ id: WORKSPACE_ID, appName: 'my-app' }) };
    fileApi = { getFileTree: vi.fn(), getFileContent: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [LocalFileExplorerController],
      providers: [
        { provide: FileApiService, useValue: fileApi },
        { provide: WorkspaceService, useValue: workspaceService },
      ],
    }).compile();

    controller = moduleRef.get(LocalFileExplorerController);
  });

  describe('getFileTree', () => {
    it('looks up the workspace for the user and returns the tree for its app', async () => {
      const tree = [{ id: 'a.txt', name: 'a.txt', path: 'a.txt', type: 'file' }];
      fileApi.getFileTree.mockResolvedValue(tree);

      expect(await controller.getFileTree(WORKSPACE_ID, user)).toBe(tree);
      expect(workspaceService.getWorkspace).toHaveBeenCalledWith({ id: WORKSPACE_ID }, 'user-1');
      expect(fileApi.getFileTree).toHaveBeenCalledWith('my-app');
    });

    it('throws NotFoundException when the workspace is not found', async () => {
      workspaceService.getWorkspace.mockResolvedValue(null);

      await expect(controller.getFileTree(WORKSPACE_ID, user)).rejects.toThrow(
        new NotFoundException(`Workspace with ID ${WORKSPACE_ID} not found`),
      );
      expect(fileApi.getFileTree).not.toHaveBeenCalled();
    });

    it('propagates a file API failure', async () => {
      fileApi.getFileTree.mockRejectedValue(new Error('boom'));

      await expect(controller.getFileTree(WORKSPACE_ID, user)).rejects.toThrow('boom');
    });
  });

  describe('readFile', () => {
    it('looks up the workspace for the user and returns the file content for its app', async () => {
      const file = { path: 'src/index.ts', content: 'export {};' };
      fileApi.getFileContent.mockResolvedValue(file);

      expect(await controller.readFile(WORKSPACE_ID, 'src/index.ts', user)).toBe(file);
      expect(workspaceService.getWorkspace).toHaveBeenCalledWith({ id: WORKSPACE_ID }, 'user-1');
      expect(fileApi.getFileContent).toHaveBeenCalledWith('my-app', 'src/index.ts');
    });

    it('throws NotFoundException when the workspace is not found', async () => {
      workspaceService.getWorkspace.mockResolvedValue(null);

      await expect(controller.readFile(WORKSPACE_ID, 'a.txt', user)).rejects.toThrow(
        new NotFoundException(`Workspace with ID ${WORKSPACE_ID} not found`),
      );
      expect(fileApi.getFileContent).not.toHaveBeenCalled();
    });

    it('propagates a file API NotFoundException', async () => {
      fileApi.getFileContent.mockRejectedValue(new NotFoundException('File not found: a.txt'));

      await expect(controller.readFile(WORKSPACE_ID, 'a.txt', user)).rejects.toThrow('File not found: a.txt');
    });
  });
});
