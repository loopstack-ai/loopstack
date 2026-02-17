import { Injectable } from '@nestjs/common';
import { FileSystemService } from './file-system.service';
import { InstallMode, LoopstackModuleConfig, ModuleInstallerService } from './module-installer.service';
import { PackageService } from './package.service';
import { RegistryService } from './registry.service';
import { WorkflowInstallerService } from './workflow-installer.service';

export interface ResolvedPackage {
  packageName: string;
  packageArg: string;
  srcPath: string;
  moduleConfig: LoopstackModuleConfig | null;
}

export interface RegisterModuleOptions {
  moduleConfig: LoopstackModuleConfig;
  sourcePath: string;
  targetPath: string;
  resolvedTargetModuleFile: string;
  importPath?: string;
  targetWorkspaceFile?: string;
}

@Injectable()
export class RegistryCommandService {
  constructor(
    private readonly registryService: RegistryService,
    private readonly packageService: PackageService,
    private readonly fileSystemService: FileSystemService,
    private readonly moduleInstallerService: ModuleInstallerService,
    private readonly workflowInstallerService: WorkflowInstallerService,
  ) {}

  async resolveAndInstallPackage(packageArg: string, installMode: InstallMode): Promise<ResolvedPackage> {
    const packageName = this.packageService.parsePackageName(packageArg);

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
    const moduleConfig = this.packageService.getModuleConfig(packageName);

    if (moduleConfig?.installModes && !moduleConfig.installModes.includes(installMode)) {
      const supported = moduleConfig.installModes.join(', ');
      console.error(
        `Package '${packageName}' does not support install mode '${installMode}'. Supported modes: ${supported}`,
      );
      process.exit(1);
    }

    return { packageName, packageArg, srcPath, moduleConfig };
  }

  async resolveTargetModule(targetModuleFile?: string): Promise<string> {
    const projectSrcRoot = this.fileSystemService.resolvePath(process.cwd(), 'src');
    return this.moduleInstallerService.resolveTargetModule({
      targetModuleFile,
      moduleSearchRoot: projectSrcRoot,
    });
  }

  async registerModule(options: RegisterModuleOptions): Promise<void> {
    const { moduleConfig, resolvedTargetModuleFile } = options;
    let moduleInstallFailed = false;
    let workflowInstallFailed = false;

    console.log('Found loopstack config in package.json, running module installer...');
    try {
      await this.moduleInstallerService.install({
        config: moduleConfig,
        sourcePath: options.sourcePath,
        targetPath: options.targetPath,
        resolvedTargetModuleFile,
        importPath: options.importPath,
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
          targetPath: options.targetPath,
          targetWorkspaceFile: options.targetWorkspaceFile,
          importPath: options.importPath,
          workspaceSearchRoot: this.fileSystemService.dirname(resolvedTargetModuleFile),
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
}
