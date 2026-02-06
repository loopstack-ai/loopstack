import { Command, CommandRunner, Option } from 'nest-commander';
import { FileSystemService } from '../services/file-system.service';
import { ModuleInstallerService } from '../services/module-installer.service';
import { PackageService } from '../services/package.service';
import { PromptService } from '../services/prompt.service';
import { RegistryService } from '../services/registry.service';
import { WorkflowInstallerService } from '../services/workflow-installer.service';

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
    private readonly registryService: RegistryService,
    private readonly packageService: PackageService,
    private readonly fileSystemService: FileSystemService,
    private readonly promptService: PromptService,
    private readonly moduleInstallerService: ModuleInstallerService,
    private readonly workflowInstallerService: WorkflowInstallerService,
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

    const packageName = this.packageService.parsePackageName(packageArg);

    try {
      const registryItem = await this.registryService.findItem(packageName);

      if (!registryItem) {
        console.error(`Package '${packageName}' not found in registry`);
        console.log(`Check available items at: ${this.registryService.getRegistryUrl()}`);
        process.exit(1);
      }

      if (this.packageService.isInstalled(packageName)) {
        console.log(`Package '${packageName}' is already installed, skipping npm install.`);
      } else {
        console.log(`Installing ${packageArg}...`);
        this.packageService.install(packageArg);
      }

      const srcPath = this.packageService.getSrcPath(packageName);

      if (!this.fileSystemService.exists(srcPath)) {
        console.error(`Package '${packageName}' does not contain a src directory (${srcPath})`);
        process.exit(1);
      }

      const targetDir = options.dir || (await this.promptForDirectory(packageName));
      const fullTargetPath = this.fileSystemService.resolvePath(process.cwd(), targetDir);

      if (this.fileSystemService.exists(fullTargetPath)) {
        console.error(`Directory already exists: ${targetDir}`);
        process.exit(1);
      }

      this.fileSystemService.createDirectory(fullTargetPath);
      this.fileSystemService.copyRecursive(srcPath, fullTargetPath);

      console.log(`\nSources copied to: ${targetDir}`);

      const moduleConfig = this.packageService.getModuleConfig(packageName);
      if (moduleConfig) {
        let moduleInstallFailed = false;
        let workflowInstallFailed = false;

        console.log('Found loopstack-module.json, running module installer...');
        try {
          await this.moduleInstallerService.install({
            config: moduleConfig,
            sourcePath: srcPath,
            targetPath: fullTargetPath,
            targetModuleFile: options.module,
          });
        } catch (error) {
          moduleInstallFailed = true;
          console.error(`Module installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        if (!moduleInstallFailed && moduleConfig.workflows && moduleConfig.workflows.length > 0) {
          console.log('Installing workflows...');
          try {
            await this.workflowInstallerService.install({
              workflows: moduleConfig.workflows,
              targetPath: fullTargetPath,
              targetWorkspaceFile: options.workspace,
            });
          } catch (error) {
            workflowInstallFailed = true;
            console.error(`Workflow installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        if (moduleInstallFailed || workflowInstallFailed) {
          console.log('\nAutomatic registration failed. Please manually:');
          if (moduleInstallFailed) {
            console.log(`  - Import and add the module to your target module's imports array`);
          }
          if (workflowInstallFailed || moduleInstallFailed) {
            console.log(`  - Import and add workflows to your workspace class with @InjectWorkflow() decorator`);
          }
        } else {
          // Run format script if available
          if (this.packageService.hasScript('format')) {
            console.log('Running format...');
            try {
              this.packageService.runScript('format');
            } catch {
              console.warn('Format script failed, but installation was successful.');
            }
          }
        }
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

  private async promptForDirectory(packageName: string): Promise<string> {
    const simpleName = this.packageService.getSimpleName(packageName);
    const defaultDir = `src/${simpleName}`;
    return this.promptService.question('Install directory', defaultDir);
  }
}
