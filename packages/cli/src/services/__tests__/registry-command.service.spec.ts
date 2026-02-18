import { Test, TestingModule } from '@nestjs/testing';
import { FileSystemService } from '../file-system.service';
import { ModuleInstallerService } from '../module-installer.service';
import { PackageService } from '../package.service';
import { RegistryCommandService } from '../registry-command.service';
import { RegistryService } from '../registry.service';
import { WorkflowInstallerService } from '../workflow-installer.service';

describe('RegistryCommandService', () => {
  let service: RegistryCommandService;
  let registryService: jest.Mocked<RegistryService>;
  let packageService: jest.Mocked<PackageService>;
  let fileSystemService: jest.Mocked<FileSystemService>;
  let moduleInstallerService: jest.Mocked<ModuleInstallerService>;
  let workflowInstallerService: jest.Mocked<WorkflowInstallerService>;
  let module: TestingModule;

  let mockProcessExit: jest.SpyInstance;

  beforeEach(async () => {
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    module = await Test.createTestingModule({
      providers: [
        RegistryCommandService,
        {
          provide: RegistryService,
          useValue: {
            findItem: jest.fn(),
            getRegistryUrl: jest.fn().mockReturnValue('https://loopstack.ai/r/registry.json'),
          },
        },
        {
          provide: PackageService,
          useValue: {
            parsePackageName: jest.fn((arg) => arg),
            isInstalled: jest.fn().mockReturnValue(false),
            install: jest.fn(),
            getSrcPath: jest.fn().mockReturnValue('/node_modules/pkg/src'),
            getModuleConfig: jest.fn(),
            hasScript: jest.fn().mockReturnValue(false),
            runScript: jest.fn(),
          },
        },
        {
          provide: FileSystemService,
          useValue: {
            resolvePath: jest.fn((_base, rel) => `/resolved/${rel}`),
            dirname: jest.fn((p) => p.replace(/\/[^/]+$/, '')),
          },
        },
        {
          provide: ModuleInstallerService,
          useValue: {
            resolveTargetModule: jest.fn(),
            install: jest.fn(),
          },
        },
        {
          provide: WorkflowInstallerService,
          useValue: {
            install: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RegistryCommandService);
    registryService = module.get(RegistryService);
    packageService = module.get(PackageService);
    fileSystemService = module.get(FileSystemService);
    moduleInstallerService = module.get(ModuleInstallerService);
    workflowInstallerService = module.get(WorkflowInstallerService);
  });

  afterEach(async () => {
    await module.close();
    jest.restoreAllMocks();
  });

  describe('resolveAndInstallPackage', () => {
    it('should exit when package is not found in registry', async () => {
      registryService.findItem.mockResolvedValue(null);

      await service.resolveAndInstallPackage('@loopstack/unknown', 'install');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should install the package when not already installed', async () => {
      registryService.findItem.mockResolvedValue({ name: '@loopstack/test' });
      packageService.isInstalled.mockReturnValue(false);
      packageService.getModuleConfig.mockReturnValue(null);

      await service.resolveAndInstallPackage('@loopstack/test', 'install');

      expect(packageService.install).toHaveBeenCalledWith('@loopstack/test');
    });

    it('should skip npm install when package is already installed', async () => {
      registryService.findItem.mockResolvedValue({ name: '@loopstack/test' });
      packageService.isInstalled.mockReturnValue(true);
      packageService.getModuleConfig.mockReturnValue(null);

      await service.resolveAndInstallPackage('@loopstack/test', 'install');

      expect(packageService.install).not.toHaveBeenCalled();
    });

    it('should return resolved package with module config', async () => {
      const config = {
        modules: [{ path: 'src/test.module.ts', className: 'TestModule' }],
      };
      registryService.findItem.mockResolvedValue({ name: '@loopstack/test' });
      packageService.isInstalled.mockReturnValue(true);
      packageService.getModuleConfig.mockReturnValue(config);

      const result = await service.resolveAndInstallPackage('@loopstack/test', 'install');

      expect(result.moduleConfig).toEqual(config);
      expect(result.packageName).toBe('@loopstack/test');
    });

    it('should exit when install mode is not supported', async () => {
      registryService.findItem.mockResolvedValue({ name: '@loopstack/test' });
      packageService.isInstalled.mockReturnValue(true);
      packageService.getModuleConfig.mockReturnValue({
        modules: [{ path: 'src/test.module.ts', className: 'TestModule' }],
        installModes: ['install'],
      });

      await service.resolveAndInstallPackage('@loopstack/test', 'add');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should allow install mode when it is in the supported list', async () => {
      registryService.findItem.mockResolvedValue({ name: '@loopstack/test' });
      packageService.isInstalled.mockReturnValue(true);
      packageService.getModuleConfig.mockReturnValue({
        modules: [{ path: 'src/test.module.ts', className: 'TestModule' }],
        installModes: ['add', 'install'],
      });

      const result = await service.resolveAndInstallPackage('@loopstack/test', 'add');

      expect(mockProcessExit).not.toHaveBeenCalled();
      expect(result.packageName).toBe('@loopstack/test');
    });
  });

  describe('resolveTargetModule', () => {
    it('should delegate to moduleInstallerService', async () => {
      fileSystemService.resolvePath.mockReturnValue('/project/src');
      moduleInstallerService.resolveTargetModule.mockResolvedValue('/project/src/default.module.ts');

      const result = await service.resolveTargetModule();

      expect(moduleInstallerService.resolveTargetModule).toHaveBeenCalledWith({
        targetModuleFile: undefined,
        moduleSearchRoot: '/project/src',
      });
      expect(result).toBe('/project/src/default.module.ts');
    });

    it('should pass through the specified module file', async () => {
      fileSystemService.resolvePath.mockReturnValue('/project/src');
      moduleInstallerService.resolveTargetModule.mockResolvedValue('/project/src/custom.module.ts');

      await service.resolveTargetModule('src/custom.module.ts');

      expect(moduleInstallerService.resolveTargetModule).toHaveBeenCalledWith({
        targetModuleFile: 'src/custom.module.ts',
        moduleSearchRoot: '/project/src',
      });
    });
  });

  describe('registerModule', () => {
    const moduleConfig = {
      modules: [
        { path: 'src/test.module.ts', className: 'TestModule' },
        { package: '@loopstack/oauth-module', className: 'OAuthModule' },
      ],
      workflows: [{ path: 'src/workflows/test.workflow.ts', className: 'TestWorkflow', propertyName: 'test' }],
    };

    it('should install modules and workflows', async () => {
      await service.registerModule({
        moduleConfig,
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(moduleInstallerService.install).toHaveBeenCalledWith({
        config: moduleConfig,
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
        importPath: undefined,
      });
      expect(workflowInstallerService.install).toHaveBeenCalledWith({
        workflows: moduleConfig.workflows,
        targetPath: '/target',
        targetWorkspaceFile: undefined,
        importPath: undefined,
        workspaceSearchRoot: '/project/src',
      });
    });

    it('should skip workflows when module install fails', async () => {
      moduleInstallerService.install.mockRejectedValue(new Error('Module install failed'));

      await service.registerModule({
        moduleConfig,
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(workflowInstallerService.install).not.toHaveBeenCalled();
    });

    it('should skip workflows when config has no workflows', async () => {
      await service.registerModule({
        moduleConfig: {
          modules: [{ path: 'src/test.module.ts', className: 'TestModule' }],
        },
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(workflowInstallerService.install).not.toHaveBeenCalled();
    });

    it('should run format script on success', async () => {
      packageService.hasScript.mockReturnValue(true);

      await service.registerModule({
        moduleConfig,
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(packageService.runScript).toHaveBeenCalledWith('format');
    });

    it('should not run format script when it does not exist', async () => {
      packageService.hasScript.mockReturnValue(false);

      await service.registerModule({
        moduleConfig,
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(packageService.runScript).not.toHaveBeenCalled();
    });

    it('should handle format script failure gracefully', async () => {
      packageService.hasScript.mockReturnValue(true);
      packageService.runScript.mockImplementation(() => {
        throw new Error('format failed');
      });

      await service.registerModule({
        moduleConfig,
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
      });

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Format script failed'));
    });

    it('should pass importPath and targetWorkspaceFile through', async () => {
      await service.registerModule({
        moduleConfig,
        targetPath: '/target',
        resolvedTargetModuleFile: '/project/src/default.module.ts',
        importPath: '@loopstack/test',
        targetWorkspaceFile: 'src/custom.workspace.ts',
      });

      expect(moduleInstallerService.install).toHaveBeenCalledWith(
        expect.objectContaining({ importPath: '@loopstack/test' }),
      );
      expect(workflowInstallerService.install).toHaveBeenCalledWith(
        expect.objectContaining({
          importPath: '@loopstack/test',
          targetWorkspaceFile: 'src/custom.workspace.ts',
        }),
      );
    });
  });
});
