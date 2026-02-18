import { Injectable } from '@nestjs/common';
import { SyntaxKind } from 'ts-morph';
import { FileSystemService } from './file-system.service';
import { PromptService } from './prompt.service';
import { TypeScriptAstService } from './typescript-ast.service';

export type InstallMode = 'add' | 'install';

export interface LocalModuleEntry {
  path: string;
  className: string;
}

export interface DependencyModuleEntry {
  package: string;
  className: string;
}

export type ModuleEntry = LocalModuleEntry | DependencyModuleEntry;

export interface LocalWorkflowEntry {
  path: string;
  className: string;
  propertyName: string;
  options?: Record<string, unknown>;
}

export interface DependencyWorkflowEntry {
  package: string;
  className: string;
  propertyName: string;
  options?: Record<string, unknown>;
}

export type WorkflowEntry = LocalWorkflowEntry | DependencyWorkflowEntry;

export interface LoopstackModuleConfig {
  modules: ModuleEntry[];
  workflows?: WorkflowEntry[];
  installModes?: InstallMode[];
}

export interface ModuleInstallOptions {
  config: LoopstackModuleConfig;
  targetPath: string;
  resolvedTargetModuleFile: string;
  importPath?: string;
}

const MODULE_FILE_PATTERN = /\.module\.ts$/;

@Injectable()
export class ModuleInstallerService {
  constructor(
    private readonly fileSystemService: FileSystemService,
    private readonly promptService: PromptService,
    private readonly astService: TypeScriptAstService,
  ) {}

  async resolveTargetModule(options: { targetModuleFile?: string; moduleSearchRoot: string }): Promise<string> {
    const { targetModuleFile: specifiedModuleFile, moduleSearchRoot } = options;

    if (specifiedModuleFile) {
      const resolved = this.fileSystemService.resolvePath(process.cwd(), specifiedModuleFile);

      if (!this.fileSystemService.exists(resolved)) {
        throw new Error(`Specified module file not found: ${specifiedModuleFile}`);
      }

      return resolved;
    }

    const moduleFiles = this.fileSystemService.findFiles(moduleSearchRoot, MODULE_FILE_PATTERN);

    if (moduleFiles.length === 0) {
      throw new Error(`No .module.ts files found in ${moduleSearchRoot}. Cannot register the module.`);
    }

    return this.selectTargetModule(moduleFiles);
  }

  install(options: ModuleInstallOptions): void {
    const { config, targetPath, resolvedTargetModuleFile } = options;

    for (const moduleEntry of config.modules) {
      let importPath: string;

      if (this.isDependencyEntry(moduleEntry)) {
        importPath = moduleEntry.package;
      } else {
        const sourceModulePath = this.fileSystemService.resolvePath(targetPath, moduleEntry.path.replace(/^src\//, ''));
        importPath =
          options.importPath ?? this.astService.calculateImportPath(resolvedTargetModuleFile, sourceModulePath);
      }

      this.addModuleImport(resolvedTargetModuleFile, moduleEntry.className, importPath);
      console.log(
        `Registered ${moduleEntry.className} in ${this.fileSystemService.getFileName(resolvedTargetModuleFile)}`,
      );
    }
  }

  private isDependencyEntry(
    entry: ModuleEntry | WorkflowEntry,
  ): entry is DependencyModuleEntry | DependencyWorkflowEntry {
    return 'package' in entry;
  }

  private async selectTargetModule(moduleFiles: string[]): Promise<string> {
    if (moduleFiles.length === 1) {
      return moduleFiles[0];
    }

    const defaultModule = moduleFiles.find((f) => f.endsWith('default.module.ts'));
    const appModule = moduleFiles.find((f) => f.endsWith('app.module.ts'));
    const defaultSelection = defaultModule || appModule || moduleFiles[0];

    const cwd = process.cwd();
    const options = moduleFiles.map((file) => ({
      label: this.fileSystemService.relativePath(cwd, file),
      value: file,
    }));

    return this.promptService.select('Select target module to register in:', options, defaultSelection);
  }

  private addModuleImport(targetModuleFile: string, moduleClassName: string, importPath: string): void {
    const project = this.astService.createProject();
    const sourceFile = this.astService.loadSourceFile(project, targetModuleFile);

    this.astService.addNamedImport(sourceFile, moduleClassName, importPath);

    const classes = sourceFile.getClasses();

    for (const classDecl of classes) {
      const moduleDecorator = classDecl.getDecorator('Module');
      if (!moduleDecorator) continue;

      const args = moduleDecorator.getArguments();
      if (args.length === 0) continue;

      const configArg = args[0];
      if (configArg.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;

      const objectLiteral = configArg.asKind(SyntaxKind.ObjectLiteralExpression);
      if (!objectLiteral) continue;

      const importsProperty = objectLiteral.getProperty('imports');

      if (importsProperty && importsProperty.getKind() === SyntaxKind.PropertyAssignment) {
        const propertyAssignment = importsProperty.asKind(SyntaxKind.PropertyAssignment);
        const initializer = propertyAssignment?.getInitializer();

        if (initializer?.getKind() === SyntaxKind.ArrayLiteralExpression) {
          const arrayLiteral = initializer.asKind(SyntaxKind.ArrayLiteralExpression);

          const elements = arrayLiteral?.getElements() || [];
          const alreadyImported = elements.some((el) => el.getText() === moduleClassName);

          if (!alreadyImported && arrayLiteral) {
            arrayLiteral.addElement(moduleClassName);
          }
        }
      } else {
        objectLiteral.addPropertyAssignment({
          name: 'imports',
          initializer: `[${moduleClassName}]`,
        });
      }

      break;
    }

    this.astService.organizeAndSave(sourceFile);
  }
}
