import { Injectable } from '@nestjs/common';
import { FileSystemService } from './file-system.service';
import { WorkflowEntry, WorkflowEntryOptions } from './module-installer.service';
import { PromptService } from './prompt.service';
import { TypeScriptAstService } from './typescript-ast.service';

export interface WorkflowInstallOptions {
  workflows: WorkflowEntry[];
  targetPath: string;
  targetWorkspaceFile?: string;
}

const WORKSPACE_FILE_PATTERN = /\.workspace\.ts$/;

@Injectable()
export class WorkflowInstallerService {
  constructor(
    private readonly fileSystemService: FileSystemService,
    private readonly promptService: PromptService,
    private readonly astService: TypeScriptAstService,
  ) {}

  async install(options: WorkflowInstallOptions): Promise<void> {
    const { workflows, targetPath, targetWorkspaceFile: specifiedWorkspaceFile } = options;

    if (workflows.length === 0) {
      return;
    }

    let targetWorkspaceFile: string;

    if (specifiedWorkspaceFile) {
      targetWorkspaceFile = this.fileSystemService.resolvePath(process.cwd(), specifiedWorkspaceFile);

      if (!this.fileSystemService.exists(targetWorkspaceFile)) {
        throw new Error(`Specified workspace file not found: ${specifiedWorkspaceFile}`);
      }
    } else {
      const targetRoot = this.fileSystemService.dirname(targetPath);
      const workspaceFiles = this.fileSystemService.findFiles(targetRoot, WORKSPACE_FILE_PATTERN);

      if (workspaceFiles.length === 0) {
        console.log(`No .workspace.ts files found in ${targetRoot}. Skipping workflow registration.`);
        return;
      }

      targetWorkspaceFile = await this.selectTargetWorkspace(workspaceFiles);
    }

    for (const workflowEntry of workflows) {
      const workflowPath = typeof workflowEntry === 'string' ? workflowEntry : workflowEntry.path;
      const decoratorOptions = typeof workflowEntry === 'string' ? undefined : workflowEntry.options;

      const sourceWorkflowPath = this.fileSystemService.resolvePath(targetPath, workflowPath.replace(/^src\//, ''));

      if (!this.fileSystemService.exists(sourceWorkflowPath)) {
        console.warn(`Workflow file not found: ${sourceWorkflowPath}, skipping...`);
        continue;
      }

      const workflowClassName = this.extractWorkflowClassName(sourceWorkflowPath);

      if (!workflowClassName) {
        console.warn(`Could not find workflow class in ${sourceWorkflowPath}, skipping...`);
        continue;
      }

      const importPath = this.astService.calculateImportPath(targetWorkspaceFile, sourceWorkflowPath);
      const propertyName = this.classNameToPropertyName(workflowClassName);

      this.addWorkflowToWorkspace(targetWorkspaceFile, workflowClassName, importPath, propertyName, decoratorOptions);

      console.log(targetWorkspaceFile, workflowClassName, importPath, propertyName);
      console.log(`Registered ${workflowClassName} in ${this.fileSystemService.getFileName(targetWorkspaceFile)}`);
    }
  }

  private async selectTargetWorkspace(workspaceFiles: string[]): Promise<string> {
    const defaultWorkspace = workspaceFiles.find((f) => f.endsWith('default.workspace.ts'));

    if (workspaceFiles.length === 1) {
      return workspaceFiles[0];
    }

    const defaultSelection = defaultWorkspace || workspaceFiles[0];

    const options = workspaceFiles.map((file) => ({
      label: this.fileSystemService.getFileName(file),
      value: file,
    }));

    return this.promptService.select('Select target workspace to register workflows in:', options, defaultSelection);
  }

  private extractWorkflowClassName(workflowPath: string): string | null {
    const project = this.astService.createProject();
    const sourceFile = this.astService.loadSourceFile(project, workflowPath);

    const classes = sourceFile.getClasses();
    const classDecl = classes[0];
    if (classDecl) {
      return classDecl.getName() ?? null;
    }

    return null;
  }

  private classNameToPropertyName(className: string): string {
    const withoutSuffix = className.replace(/Workflow$/, '');
    return withoutSuffix.charAt(0).toLowerCase() + withoutSuffix.slice(1);
  }

  private addWorkflowToWorkspace(
    targetWorkspaceFile: string,
    workflowClassName: string,
    importPath: string,
    propertyName: string,
    decoratorOptions?: WorkflowEntryOptions,
  ): void {
    const project = this.astService.createProject();
    const sourceFile = this.astService.loadSourceFile(project, targetWorkspaceFile);

    this.astService.addNamedImport(sourceFile, workflowClassName, importPath);

    const classes = sourceFile.getClasses();
    const classDecl = classes[0];
    const existingProperty = classDecl.getProperty(propertyName);
    if (existingProperty) {
      throw new Error(`Property ${propertyName} already exists.`);
    }

    const properties = classDecl.getProperties();
    const hasWorkflowType = properties.some((prop) => {
      const typeNode = prop.getTypeNode();
      return typeNode?.getText() === workflowClassName;
    });

    if (hasWorkflowType) {
      throw new Error(`Class already has injected workflow ${workflowClassName}.`);
    }

    const decoratorArgs = decoratorOptions ? [JSON.stringify(decoratorOptions)] : [];

    classDecl.addProperty({
      name: propertyName,
      type: workflowClassName,
      decorators: [{ name: 'InjectWorkflow', arguments: decoratorArgs }],
    });

    this.astService.organizeAndSave(sourceFile);
  }
}
