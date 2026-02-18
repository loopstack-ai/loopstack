import { Test, TestingModule } from '@nestjs/testing';
import { Project } from 'ts-morph';
import { FileSystemService } from '../file-system.service';
import { TypeScriptAstService } from '../typescript-ast.service';

describe('TypeScriptAstService', () => {
  let service: TypeScriptAstService;
  let fileSystemService: jest.Mocked<FileSystemService>;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        TypeScriptAstService,
        {
          provide: FileSystemService,
          useValue: {
            dirname: jest.fn((p) => {
              const parts = p.split('/');
              parts.pop();
              return parts.join('/');
            }),
            relativePath: jest.fn((from, to) => {
              // Simple mock: just return relative-like path
              if (to.startsWith(from)) {
                return to.substring(from.length + 1);
              }
              return '../' + to.split('/').pop();
            }),
          },
        },
      ],
    }).compile();

    service = module.get(TypeScriptAstService);
    fileSystemService = module.get(FileSystemService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('createProject', () => {
    it('should return a ts-morph Project instance', () => {
      const project = service.createProject();

      expect(project).toBeInstanceOf(Project);
    });
  });

  describe('calculateImportPath', () => {
    it('should strip .ts extension from import path', () => {
      fileSystemService.dirname.mockReturnValue('/project/src');
      fileSystemService.relativePath.mockReturnValue('modules/test.module.ts');

      const result = service.calculateImportPath('/project/src/app.module.ts', '/project/src/modules/test.module.ts');

      expect(result).toBe('./modules/test.module');
    });

    it('should prepend ./ when relative path does not start with dot', () => {
      fileSystemService.dirname.mockReturnValue('/project/src');
      fileSystemService.relativePath.mockReturnValue('test.module.ts');

      const result = service.calculateImportPath('/project/src/app.module.ts', '/project/src/test.module.ts');

      expect(result).toBe('./test.module');
    });

    it('should preserve ../ prefix for parent directory paths', () => {
      fileSystemService.dirname.mockReturnValue('/project/src/sub');
      fileSystemService.relativePath.mockReturnValue('../other/test.module.ts');

      const result = service.calculateImportPath('/project/src/sub/app.module.ts', '/project/src/other/test.module.ts');

      expect(result).toBe('../other/test.module');
    });
  });

  describe('addNamedImport', () => {
    it('should add a new import declaration when none exists for the path', () => {
      const project = new Project({ useInMemoryFileSystem: true });
      const sourceFile = project.createSourceFile('test.ts', '');

      service.addNamedImport(sourceFile, 'TestClass', './test');

      const imports = sourceFile.getImportDeclarations();
      expect(imports).toHaveLength(1);
      expect(imports[0].getModuleSpecifierValue()).toBe('./test');
      expect(imports[0].getNamedImports()[0].getName()).toBe('TestClass');
    });

    it('should add to existing import when path already has an import', () => {
      const project = new Project({ useInMemoryFileSystem: true });
      const sourceFile = project.createSourceFile('test.ts', "import { ExistingClass } from './test';");

      service.addNamedImport(sourceFile, 'NewClass', './test');

      const imports = sourceFile.getImportDeclarations();
      expect(imports).toHaveLength(1);
      const namedImports = imports[0].getNamedImports();
      expect(namedImports).toHaveLength(2);
      expect(namedImports.map((ni) => ni.getName())).toContain('NewClass');
    });

    it('should not duplicate an existing named import', () => {
      const project = new Project({ useInMemoryFileSystem: true });
      const sourceFile = project.createSourceFile('test.ts', "import { TestClass } from './test';");

      service.addNamedImport(sourceFile, 'TestClass', './test');

      const imports = sourceFile.getImportDeclarations();
      expect(imports[0].getNamedImports()).toHaveLength(1);
    });
  });
});
