import { Test, TestingModule } from '@nestjs/testing';
import { FileSystemService } from '../file-system.service';
import { ModuleInstallerService } from '../module-installer.service';
import { PromptService } from '../prompt.service';
import { TypeScriptAstService } from '../typescript-ast.service';

describe('ModuleInstallerService', () => {
  let service: ModuleInstallerService;
  let fileSystemService: jest.Mocked<FileSystemService>;
  let promptService: jest.Mocked<PromptService>;
  let astService: jest.Mocked<TypeScriptAstService>;
  let module: TestingModule;

  const mockSourceFile = {
    getClasses: jest.fn().mockReturnValue([]),
    organizeImports: jest.fn(),
    saveSync: jest.fn(),
  };

  const mockProject = {
    addSourceFileAtPath: jest.fn().mockReturnValue(mockSourceFile),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ModuleInstallerService,
        {
          provide: FileSystemService,
          useValue: {
            exists: jest.fn(),
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
            question: jest.fn(),
          },
        },
        {
          provide: TypeScriptAstService,
          useValue: {
            createProject: jest.fn().mockReturnValue(mockProject),
            loadSourceFile: jest.fn().mockReturnValue(mockSourceFile),
            calculateImportPath: jest.fn().mockReturnValue('./relative/import'),
            addNamedImport: jest.fn(),
            organizeAndSave: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ModuleInstallerService);
    fileSystemService = module.get(FileSystemService);
    promptService = module.get(PromptService);
    astService = module.get(TypeScriptAstService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('resolveTargetModule', () => {
    it('should resolve a specified module file', async () => {
      fileSystemService.resolvePath.mockReturnValue('/project/src/app.module.ts');
      fileSystemService.exists.mockReturnValue(true);

      const result = await service.resolveTargetModule({
        targetModuleFile: 'src/app.module.ts',
        moduleSearchRoot: '/project/src',
      });

      expect(result).toBe('/project/src/app.module.ts');
    });

    it('should throw when specified module file does not exist', async () => {
      fileSystemService.resolvePath.mockReturnValue('/project/src/missing.module.ts');
      fileSystemService.exists.mockReturnValue(false);

      await expect(
        service.resolveTargetModule({
          targetModuleFile: 'src/missing.module.ts',
          moduleSearchRoot: '/project/src',
        }),
      ).rejects.toThrow('Specified module file not found');
    });

    it('should throw when no module files are found', async () => {
      fileSystemService.findFiles.mockReturnValue([]);

      await expect(
        service.resolveTargetModule({
          moduleSearchRoot: '/project/src',
        }),
      ).rejects.toThrow('No .module.ts files found');
    });

    it('should return the only module file when exactly one is found', async () => {
      fileSystemService.findFiles.mockReturnValue(['/project/src/app.module.ts']);

      const result = await service.resolveTargetModule({
        moduleSearchRoot: '/project/src',
      });

      expect(result).toBe('/project/src/app.module.ts');
    });

    it('should prompt for selection when multiple module files are found', async () => {
      const files = ['/project/src/app.module.ts', '/project/src/other.module.ts'];
      fileSystemService.findFiles.mockReturnValue(files);
      promptService.select.mockResolvedValue('/project/src/app.module.ts');

      const result = await service.resolveTargetModule({
        moduleSearchRoot: '/project/src',
      });

      expect(promptService.select).toHaveBeenCalled();
      expect(result).toBe('/project/src/app.module.ts');
    });

    it('should default to default.module.ts when multiple files are found', async () => {
      const files = ['/project/src/other.module.ts', '/project/src/default.module.ts'];
      fileSystemService.findFiles.mockReturnValue(files);
      promptService.select.mockResolvedValue('/project/src/default.module.ts');

      await service.resolveTargetModule({
        moduleSearchRoot: '/project/src',
      });

      expect(promptService.select).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        '/project/src/default.module.ts',
      );
    });
  });

  describe('install', () => {
    it('should register a local module entry with computed import path', () => {
      fileSystemService.resolvePath.mockReturnValue('/target/calendar-example.module.ts');
      astService.calculateImportPath.mockReturnValue('./calendar-example/calendar-example.module');

      service.install({
        config: {
          modules: [{ path: 'src/calendar-example.module.ts', className: 'CalendarExampleModule' }],
        },
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(astService.calculateImportPath).toHaveBeenCalledWith(
        '/project/src/default.module.ts',
        '/target/calendar-example.module.ts',
      );
      expect(astService.addNamedImport).toHaveBeenCalled();
      expect(astService.organizeAndSave).toHaveBeenCalled();
    });

    it('should register a local module entry with explicit importPath', () => {
      fileSystemService.resolvePath.mockReturnValue('/target/calendar-example.module.ts');

      service.install({
        config: {
          modules: [{ path: 'src/calendar-example.module.ts', className: 'CalendarExampleModule' }],
        },
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
        importPath: '@loopstack/calendar-example',
      });

      expect(astService.calculateImportPath).not.toHaveBeenCalled();
    });

    it('should register a dependency module entry using its package name as import path', () => {
      service.install({
        config: {
          modules: [{ package: '@loopstack/oauth-module', className: 'OAuthModule' }],
        },
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(astService.calculateImportPath).not.toHaveBeenCalled();
      expect(astService.addNamedImport).toHaveBeenCalled();
    });

    it('should register multiple modules (local and dependency) in sequence', () => {
      fileSystemService.resolvePath.mockReturnValue('/target/calendar-example.module.ts');
      astService.calculateImportPath.mockReturnValue('./calendar-example/calendar-example.module');

      service.install({
        config: {
          modules: [
            { path: 'src/calendar-example.module.ts', className: 'CalendarExampleModule' },
            { package: '@loopstack/oauth-module', className: 'OAuthModule' },
            { package: '@loopstack/google-workspace-module', className: 'GoogleWorkspaceModule' },
          ],
        },
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(astService.addNamedImport).toHaveBeenCalledTimes(3);
      expect(astService.organizeAndSave).toHaveBeenCalledTimes(3);
    });

    it('should strip src/ prefix from local module path', () => {
      service.install({
        config: {
          modules: [{ path: 'src/my.module.ts', className: 'MyModule' }],
        },
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(fileSystemService.resolvePath).toHaveBeenCalledWith('/target', 'my.module.ts');
    });
  });
});
