import { Test, TestingModule } from '@nestjs/testing';
import { FileSystemService } from '../../services/file-system.service';
import { PackageService } from '../../services/package.service';
import { RegistryCommandService } from '../../services/registry-command.service';
import { RegistryConfigureCommand } from '../registry-configure.command';

describe('RegistryConfigureCommand', () => {
  let command: RegistryConfigureCommand;
  let registryCommandService: jest.Mocked<RegistryCommandService>;
  let packageService: jest.Mocked<PackageService>;
  let fileSystemService: jest.Mocked<FileSystemService>;
  let module: TestingModule;

  let mockProcessExit: jest.SpyInstance;

  beforeEach(async () => {
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    module = await Test.createTestingModule({
      providers: [
        RegistryConfigureCommand,
        {
          provide: RegistryCommandService,
          useValue: {
            resolveTargetModule: jest.fn().mockResolvedValue('/project/src/default.module.ts'),
            registerModule: jest.fn(),
          },
        },
        {
          provide: PackageService,
          useValue: {
            parsePackageName: jest.fn((arg) => arg),
            getModuleConfig: jest.fn(),
            getSrcPath: jest.fn().mockReturnValue('/node_modules/pkg/src'),
          },
        },
        {
          provide: FileSystemService,
          useValue: {
            resolvePath: jest.fn((_base, rel) => `/project/${rel}`),
          },
        },
      ],
    }).compile();

    command = module.get(RegistryConfigureCommand);
    registryCommandService = module.get(RegistryCommandService);
    packageService = module.get(PackageService);
    fileSystemService = module.get(FileSystemService);
  });

  afterEach(async () => {
    await module.close();
    jest.restoreAllMocks();
  });

  it('should exit with error when no package is specified', async () => {
    await command.run([], {});

    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should exit gracefully when package has no loopstack config', async () => {
    packageService.getModuleConfig.mockReturnValue(null);

    await command.run(['@loopstack/test'], {});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('no loopstack config'));
    expect(mockProcessExit).toHaveBeenCalledWith(0);
    expect(registryCommandService.registerModule).not.toHaveBeenCalled();
  });

  it('should register using package name as importPath when no --dir is provided', async () => {
    const config = {
      modules: [
        { path: 'src/test.module.ts', className: 'TestModule' },
        { package: '@loopstack/oauth-module', className: 'OAuthModule' },
      ],
      workflows: [{ package: '@loopstack/oauth-module', className: 'OAuthWorkflow', propertyName: 'oAuth' }],
    };
    packageService.getModuleConfig.mockReturnValue(config);

    await command.run(['@loopstack/test'], {});

    expect(registryCommandService.registerModule).toHaveBeenCalledWith({
      moduleConfig: config,
      targetPath: '/node_modules/pkg/src',
      resolvedTargetModuleFile: '/project/src/default.module.ts',
      importPath: '@loopstack/test',
      targetWorkspaceFile: undefined,
    });
    expect(mockProcessExit).toHaveBeenCalledWith(0);
  });

  it('should register using relative imports when --dir is provided', async () => {
    const config = {
      modules: [
        { path: 'src/test.module.ts', className: 'TestModule' },
        { package: '@loopstack/oauth-module', className: 'OAuthModule' },
      ],
      workflows: [{ path: 'src/workflows/test.workflow.ts', className: 'TestWorkflow', propertyName: 'test' }],
    };
    packageService.getModuleConfig.mockReturnValue(config);
    fileSystemService.resolvePath.mockReturnValue('/project/src/my-feature');

    await command.run(['@loopstack/test'], { dir: 'src/my-feature' });

    expect(registryCommandService.registerModule).toHaveBeenCalledWith({
      moduleConfig: config,
      targetPath: '/project/src/my-feature',
      resolvedTargetModuleFile: '/project/src/default.module.ts',
      targetWorkspaceFile: undefined,
    });
    expect(registryCommandService.registerModule).toHaveBeenCalledWith(
      expect.not.objectContaining({ importPath: expect.anything() }),
    );
  });

  it('should pass module and workspace options through', async () => {
    const config = {
      modules: [{ package: '@loopstack/oauth-module', className: 'OAuthModule' }],
    };
    packageService.getModuleConfig.mockReturnValue(config);

    await command.run(['@loopstack/test'], {
      module: 'src/custom.module.ts',
      workspace: 'src/custom.workspace.ts',
    });

    expect(registryCommandService.resolveTargetModule).toHaveBeenCalledWith('src/custom.module.ts');
    expect(registryCommandService.registerModule).toHaveBeenCalledWith(
      expect.objectContaining({
        targetWorkspaceFile: 'src/custom.workspace.ts',
      }),
    );
  });

  it('should strip version from package name for importPath', async () => {
    packageService.parsePackageName.mockReturnValue('@loopstack/google-oauth-calendar-example');
    packageService.getModuleConfig.mockReturnValue({
      modules: [{ path: 'src/test.module.ts', className: 'TestModule' }],
    });

    await command.run(['@loopstack/google-oauth-calendar-example@1.0.0'], {});

    expect(registryCommandService.registerModule).toHaveBeenCalledWith(
      expect.objectContaining({
        importPath: '@loopstack/google-oauth-calendar-example',
      }),
    );
  });

  it('should handle errors gracefully', async () => {
    packageService.getModuleConfig.mockImplementation(() => {
      throw new Error('Could not resolve package');
    });

    await command.run(['@loopstack/missing'], {});

    expect(console.error).toHaveBeenCalledWith('Could not resolve package');
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});
