import { Test, TestingModule } from '@nestjs/testing';
import { FileSystemService } from '../file-system.service';
import { PromptService } from '../prompt.service';
import { TypeScriptAstService } from '../typescript-ast.service';
import { WorkflowInstallerService } from '../workflow-installer.service';

describe('WorkflowInstallerService', () => {
  let service: WorkflowInstallerService;
  let fileSystemService: jest.Mocked<FileSystemService>;
  let promptService: jest.Mocked<PromptService>;
  let astService: jest.Mocked<TypeScriptAstService>;
  let module: TestingModule;

  let mockClassDecl: any;
  let mockSourceFile: any;

  beforeEach(async () => {
    mockClassDecl = {
      getProperty: jest.fn().mockReturnValue(undefined),
      getProperties: jest.fn().mockReturnValue([]),
      addProperty: jest.fn(),
    };

    mockSourceFile = {
      getClasses: jest.fn().mockReturnValue([mockClassDecl]),
    };

    module = await Test.createTestingModule({
      providers: [
        WorkflowInstallerService,
        {
          provide: FileSystemService,
          useValue: {
            exists: jest.fn().mockReturnValue(true),
            resolvePath: jest.fn((_base, rel) => `/resolved/${rel}`),
            findFiles: jest.fn(),
            relativePath: jest.fn((_from, to) => to),
            dirname: jest.fn((p) => p.replace(/\/[^/]+$/, '')),
            getFileName: jest.fn((p) => p.split('/').pop()),
          },
        },
        {
          provide: PromptService,
          useValue: {
            select: jest.fn(),
          },
        },
        {
          provide: TypeScriptAstService,
          useValue: {
            createProject: jest.fn().mockReturnValue({}),
            loadSourceFile: jest.fn().mockReturnValue(mockSourceFile),
            calculateImportPath: jest.fn().mockReturnValue('./relative/import'),
            addNamedImport: jest.fn(),
            organizeAndSave: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WorkflowInstallerService);
    fileSystemService = module.get(FileSystemService);
    promptService = module.get(PromptService);
    astService = module.get(TypeScriptAstService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('install', () => {
    it('should return early for empty workflows array', async () => {
      await service.install({
        workflows: [],
        targetPath: '/target',
      });

      expect(fileSystemService.findFiles).not.toHaveBeenCalled();
    });

    it('should throw when specified workspace file does not exist', async () => {
      fileSystemService.resolvePath.mockReturnValue('/project/src/missing.workspace.ts');
      fileSystemService.exists.mockReturnValue(false);

      await expect(
        service.install({
          workflows: [{ path: 'src/my.workflow.ts', className: 'MyWorkflow', propertyName: 'my' }],
          targetPath: '/target',
          targetWorkspaceFile: 'src/missing.workspace.ts',
        }),
      ).rejects.toThrow('Specified workspace file not found');
    });

    it('should skip workflow registration when no workspace files are found', async () => {
      fileSystemService.findFiles.mockReturnValue([]);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.install({
        workflows: [{ path: 'src/my.workflow.ts', className: 'MyWorkflow', propertyName: 'my' }],
        targetPath: '/target',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No .workspace.ts files found'));
      expect(astService.addNamedImport).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should register a local workflow entry', async () => {
      fileSystemService.findFiles.mockReturnValue(['/project/src/default.workspace.ts']);
      fileSystemService.exists.mockReturnValue(true);
      fileSystemService.resolvePath.mockImplementation((_base, rel) => `/resolved/${rel}`);

      await service.install({
        workflows: [
          {
            path: 'src/workflows/calendar-summary.workflow.ts',
            className: 'CalendarSummaryWorkflow',
            propertyName: 'calendarSummary',
          },
        ],
        targetPath: '/target',
      });

      expect(astService.addNamedImport).toHaveBeenCalledWith(
        mockSourceFile,
        'CalendarSummaryWorkflow',
        expect.any(String),
      );
      expect(mockClassDecl.addProperty).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'calendarSummary',
          type: 'CalendarSummaryWorkflow',
          decorators: [{ name: 'InjectWorkflow', arguments: [] }],
        }),
      );
    });

    it('should register a dependency workflow entry using package name as import', async () => {
      fileSystemService.findFiles.mockReturnValue(['/project/src/default.workspace.ts']);

      await service.install({
        workflows: [
          {
            package: '@loopstack/oauth-module',
            className: 'OAuthWorkflow',
            propertyName: 'oAuth',
          },
        ],
        targetPath: '/target',
      });

      expect(astService.calculateImportPath).not.toHaveBeenCalled();
      expect(astService.addNamedImport).toHaveBeenCalledWith(
        mockSourceFile,
        'OAuthWorkflow',
        '@loopstack/oauth-module',
      );
      expect(mockClassDecl.addProperty).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'oAuth',
          type: 'OAuthWorkflow',
        }),
      );
    });

    it('should skip local workflow when source file does not exist', async () => {
      fileSystemService.findFiles.mockReturnValue(['/project/src/default.workspace.ts']);
      fileSystemService.exists.mockImplementation((p) => {
        if (typeof p === 'string' && p.includes('missing')) return false;
        return true;
      });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.install({
        workflows: [
          {
            path: 'src/workflows/missing.workflow.ts',
            className: 'MissingWorkflow',
            propertyName: 'missing',
          },
        ],
        targetPath: '/target',
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Workflow file not found'));
      expect(mockClassDecl.addProperty).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should register multiple workflows (local and dependency)', async () => {
      fileSystemService.findFiles.mockReturnValue(['/project/src/default.workspace.ts']);
      fileSystemService.exists.mockReturnValue(true);

      await service.install({
        workflows: [
          {
            path: 'src/workflows/calendar-summary.workflow.ts',
            className: 'CalendarSummaryWorkflow',
            propertyName: 'calendarSummary',
          },
          {
            package: '@loopstack/oauth-module',
            className: 'OAuthWorkflow',
            propertyName: 'oAuth',
          },
        ],
        targetPath: '/target',
      });

      expect(mockClassDecl.addProperty).toHaveBeenCalledTimes(2);
    });

    it('should pass decorator options when provided', async () => {
      fileSystemService.findFiles.mockReturnValue(['/project/src/default.workspace.ts']);

      await service.install({
        workflows: [
          {
            package: '@loopstack/oauth-module',
            className: 'OAuthWorkflow',
            propertyName: 'oAuth',
            options: { token: 'OAUTH_TOKEN' },
          },
        ],
        targetPath: '/target',
      });

      expect(mockClassDecl.addProperty).toHaveBeenCalledWith(
        expect.objectContaining({
          decorators: [{ name: 'InjectWorkflow', arguments: ['{"token":"OAUTH_TOKEN"}'] }],
        }),
      );
    });

    it('should throw when property name already exists in workspace', async () => {
      fileSystemService.findFiles.mockReturnValue(['/project/src/default.workspace.ts']);
      mockClassDecl.getProperty.mockReturnValue({ name: 'oAuth' });

      await expect(
        service.install({
          workflows: [
            {
              package: '@loopstack/oauth-module',
              className: 'OAuthWorkflow',
              propertyName: 'oAuth',
            },
          ],
          targetPath: '/target',
        }),
      ).rejects.toThrow('Property oAuth already exists');
    });

    it('should throw when workflow type is already injected', async () => {
      fileSystemService.findFiles.mockReturnValue(['/project/src/default.workspace.ts']);
      mockClassDecl.getProperty.mockReturnValue(undefined);
      mockClassDecl.getProperties.mockReturnValue([{ getTypeNode: () => ({ getText: () => 'OAuthWorkflow' }) }]);

      await expect(
        service.install({
          workflows: [
            {
              package: '@loopstack/oauth-module',
              className: 'OAuthWorkflow',
              propertyName: 'oAuth',
            },
          ],
          targetPath: '/target',
        }),
      ).rejects.toThrow('Class already has injected workflow OAuthWorkflow');
    });

    it('should use specified workspace file', async () => {
      fileSystemService.resolvePath.mockReturnValue('/project/src/custom.workspace.ts');
      fileSystemService.exists.mockReturnValue(true);

      await service.install({
        workflows: [
          {
            package: '@loopstack/oauth-module',
            className: 'OAuthWorkflow',
            propertyName: 'oAuth',
          },
        ],
        targetPath: '/target',
        targetWorkspaceFile: 'src/custom.workspace.ts',
      });

      expect(fileSystemService.findFiles).not.toHaveBeenCalled();
      expect(astService.addNamedImport).toHaveBeenCalled();
    });

    it('should prompt when multiple workspace files are found', async () => {
      const files = ['/project/src/default.workspace.ts', '/project/src/other.workspace.ts'];
      fileSystemService.findFiles.mockReturnValue(files);
      promptService.select.mockResolvedValue('/project/src/default.workspace.ts');

      await service.install({
        workflows: [
          {
            package: '@loopstack/oauth-module',
            className: 'OAuthWorkflow',
            propertyName: 'oAuth',
          },
        ],
        targetPath: '/target',
      });

      expect(promptService.select).toHaveBeenCalledWith(
        expect.stringContaining('Select target workspace'),
        expect.any(Array),
        '/project/src/default.workspace.ts',
      );
    });

    it('should use importPath override for local workflows', async () => {
      fileSystemService.findFiles.mockReturnValue(['/project/src/default.workspace.ts']);
      fileSystemService.exists.mockReturnValue(true);

      await service.install({
        workflows: [
          {
            path: 'src/workflows/calendar-summary.workflow.ts',
            className: 'CalendarSummaryWorkflow',
            propertyName: 'calendarSummary',
          },
        ],
        targetPath: '/target',
        importPath: '@loopstack/calendar-example',
      });

      expect(astService.calculateImportPath).not.toHaveBeenCalled();
      expect(astService.addNamedImport).toHaveBeenCalledWith(
        mockSourceFile,
        'CalendarSummaryWorkflow',
        '@loopstack/calendar-example',
      );
    });
  });
});
