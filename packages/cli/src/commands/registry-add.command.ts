import { Command, CommandRunner, Option } from 'nest-commander';
import { FileSystemService } from '../services/file-system.service';
import { PackageService } from '../services/package.service';
import { PromptService } from '../services/prompt.service';
import { RegistryCommandService } from '../services/registry-command.service';

interface AddCommandOptions {
  dir?: string;
  module?: string;
  workspace?: string;
}

@Command({
  name: 'add',
  arguments: '<package>',
  description: 'Add an item from the loopstack registry',
})
export class RegistryAddCommand extends CommandRunner {
  constructor(
    private readonly registryCommandService: RegistryCommandService,
    private readonly packageService: PackageService,
    private readonly fileSystemService: FileSystemService,
    private readonly promptService: PromptService,
  ) {
    super();
  }

  async run(inputs: string[], options: AddCommandOptions): Promise<void> {
    const [packageArg] = inputs;

    if (!packageArg) {
      console.error('Please specify a package to install');
      console.log('Usage: loopstack add <package>');
      process.exit(1);
    }

    try {
      const resolved = await this.registryCommandService.resolveAndInstallPackage(packageArg, 'add');

      if (!this.fileSystemService.exists(resolved.srcPath)) {
        console.error(`Package '${resolved.packageName}' does not contain a src directory (${resolved.srcPath})`);
        process.exit(1);
      }

      let resolvedTargetModuleFile: string | undefined;
      if (resolved.moduleConfig) {
        resolvedTargetModuleFile = options.module
          ? this.fileSystemService.resolvePath(process.cwd(), options.module)
          : await this.registryCommandService.resolveTargetModule();
      }

      const moduleDir = resolvedTargetModuleFile ? this.fileSystemService.dirname(resolvedTargetModuleFile) : undefined;
      const targetDir = options.dir || (await this.promptForDirectory(resolved.packageName, moduleDir));
      const fullTargetPath = this.fileSystemService.resolvePath(process.cwd(), targetDir);

      if (this.fileSystemService.exists(fullTargetPath)) {
        console.error(`Directory already exists: ${targetDir}`);
        process.exit(1);
      }

      this.fileSystemService.createDirectory(fullTargetPath);
      this.fileSystemService.copyRecursive(resolved.srcPath, fullTargetPath);

      console.log(`\nSources copied to: ${targetDir}`);

      if (resolved.moduleConfig && resolvedTargetModuleFile) {
        await this.registryCommandService.registerModule({
          moduleConfig: resolved.moduleConfig,
          targetPath: fullTargetPath,
          resolvedTargetModuleFile,
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
    description: 'Target directory for installation',
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

  private async promptForDirectory(packageName: string, moduleDir?: string): Promise<string> {
    const simpleName = this.packageService.getSimpleName(packageName);
    const baseDir = moduleDir ? this.fileSystemService.relativePath(process.cwd(), moduleDir) : 'src';
    const defaultDir = `${baseDir}/${simpleName}`;
    return this.promptService.question('Install directory', defaultDir);
  }
}
