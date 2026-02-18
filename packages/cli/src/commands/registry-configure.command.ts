import { Command, CommandRunner, Option } from 'nest-commander';
import { FileSystemService } from '../services/file-system.service';
import { PackageService } from '../services/package.service';
import { RegistryCommandService } from '../services/registry-command.service';

interface ConfigureCommandOptions {
  dir?: string;
  module?: string;
  workspace?: string;
}

@Command({
  name: 'configure',
  arguments: '<package>',
  description: 'Configure modules and workflows from an already installed package',
})
export class RegistryConfigureCommand extends CommandRunner {
  constructor(
    private readonly registryCommandService: RegistryCommandService,
    private readonly packageService: PackageService,
    private readonly fileSystemService: FileSystemService,
  ) {
    super();
  }

  async run(inputs: string[], options: ConfigureCommandOptions): Promise<void> {
    const [packageArg] = inputs;

    if (!packageArg) {
      console.error('Please specify a package to configure');
      console.log('Usage: loopstack configure <package>');
      process.exit(1);
    }

    try {
      const packageName = this.packageService.parsePackageName(packageArg);
      const moduleConfig = this.packageService.getModuleConfig(packageName);

      if (!moduleConfig) {
        console.log(`Package '${packageName}' has no loopstack config. Nothing to configure.`);
        process.exit(0);
        return;
      }

      const resolvedTargetModuleFile = await this.registryCommandService.resolveTargetModule(options.module);

      if (options.dir) {
        const fullTargetPath = this.fileSystemService.resolvePath(process.cwd(), options.dir);

        await this.registryCommandService.registerModule({
          moduleConfig,
          targetPath: fullTargetPath,
          resolvedTargetModuleFile,
          targetWorkspaceFile: options.workspace,
        });
      } else {
        const srcPath = this.packageService.getSrcPath(packageName);

        await this.registryCommandService.registerModule({
          moduleConfig,
          targetPath: srcPath,
          resolvedTargetModuleFile,
          importPath: packageName,
          targetWorkspaceFile: options.workspace,
        });
      }

      process.exit(0);
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An unknown error occurred');
      process.exit(1);
    }
  }

  @Option({
    flags: '-d, --dir <directory>',
    description: 'Directory where source files were copied to (for add-style configuration with relative imports)',
  })
  parseDir(val: string): string {
    return val;
  }

  @Option({
    flags: '-m, --module <module>',
    description: 'Target module file to register in (e.g., src/default.module.ts)',
  })
  parseModule(val: string): string {
    return val;
  }

  @Option({
    flags: '-w, --workspace <workspace>',
    description: 'Target workspace file to register workflows in (e.g., src/default.workspace.ts)',
  })
  parseWorkspace(val: string): string {
    return val;
  }
}
