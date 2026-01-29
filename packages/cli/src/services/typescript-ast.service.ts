import { Injectable } from '@nestjs/common';
import { Project, SourceFile } from 'ts-morph';
import { FileSystemService } from './file-system.service';

@Injectable()
export class TypeScriptAstService {
  constructor(private readonly fileSystemService: FileSystemService) {}

  createProject(): Project {
    return new Project();
  }

  loadSourceFile(project: Project, filePath: string): SourceFile {
    return project.addSourceFileAtPath(filePath);
  }

  calculateImportPath(fromFile: string, toFile: string): string {
    const fromDir = this.fileSystemService.dirname(fromFile);
    let relativePath = this.fileSystemService.relativePath(fromDir, toFile);

    relativePath = relativePath.replace(/\.ts$/, '');

    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    return relativePath;
  }

  addNamedImport(sourceFile: SourceFile, className: string, importPath: string): void {
    const existingImport = sourceFile.getImportDeclaration((decl) => {
      return decl.getModuleSpecifierValue() === importPath;
    });

    if (existingImport) {
      const namedImports = existingImport.getNamedImports();
      const hasImport = namedImports.some((ni) => ni.getName() === className);

      if (!hasImport) {
        existingImport.addNamedImport(className);
      }
    } else {
      sourceFile.addImportDeclaration({
        namedImports: [className],
        moduleSpecifier: importPath,
      });
    }
  }

  organizeAndSave(sourceFile: SourceFile): void {
    sourceFile.organizeImports();
    sourceFile.saveSync();
  }
}
