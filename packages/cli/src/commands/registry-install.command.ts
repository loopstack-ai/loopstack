import { Command, CommandRunner, Option } from 'nest-commander';
import { RegistryCommandService } from '../services/registry-command.service';

interface InstallCommandOptions {
  module?: string;
  workspace?: string;
}

@Command({
  name: 'install',
  arguments: '<package>',
  description: 'Install a package from the loopstack registry and import from node_modules',
})
export class RegistryInstallCommand extends CommandRunner {
  constructor(private readonly registryCommandService: RegistryCommandService) {
    super();
  }

  async run(inputs: string[], options: InstallCommandOptions): Promise<void> {
    const [packageArg] = inputs;

    if (!packageArg) {
      console.error('Please specify a package to install');
      console.log('Usage: loopstack install <package>');
      process.exit(1);
    }

    try {
      const resolved = await this.registryCommandService.resolveAndInstallPackage(packageArg, 'install');

      if (!resolved.moduleConfig) {
        console.log(`Package '${resolved.packageName}' installed successfully (no loopstack config found).`);
        process.exit(0);
      }

      const resolvedTargetModuleFile = await this.registryCommandService.resolveTargetModule(options.module);

      await this.registryCommandService.registerModule({
        moduleConfig: resolved.moduleConfig,
        sourcePath: resolved.srcPath,
        targetPath: resolved.srcPath,
        resolvedTargetModuleFile,
        importPath: resolved.packageName,
        targetWorkspaceFile: options.workspace,
      });

      process.exit(0);
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An unknown error occurred');
      process.exit(1);
    }
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
