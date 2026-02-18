import * as fs from 'fs';
import * as path from 'path';
import { FileSystemService } from '../file-system.service';

describe('FileSystemService', () => {
  let service: FileSystemService;
  let tmpDir: string;

  beforeEach(() => {
    service = new FileSystemService();
    tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('exists', () => {
    it('should return true for existing file', () => {
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'content');

      expect(service.exists(filePath)).toBe(true);
    });

    it('should return false for non-existing file', () => {
      expect(service.exists(path.join(tmpDir, 'missing.txt'))).toBe(false);
    });
  });

  describe('createDirectory', () => {
    it('should create a directory recursively', () => {
      const dirPath = path.join(tmpDir, 'a', 'b', 'c');

      service.createDirectory(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  describe('copyRecursive', () => {
    it('should copy files and directories recursively', () => {
      const srcDir = path.join(tmpDir, 'src');
      const destDir = path.join(tmpDir, 'dest');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(path.join(srcDir, 'sub'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'file.txt'), 'hello');
      fs.writeFileSync(path.join(srcDir, 'sub', 'nested.txt'), 'world');
      fs.mkdirSync(destDir, { recursive: true });

      service.copyRecursive(srcDir, destDir);

      expect(fs.readFileSync(path.join(destDir, 'file.txt'), 'utf-8')).toBe('hello');
      expect(fs.readFileSync(path.join(destDir, 'sub', 'nested.txt'), 'utf-8')).toBe('world');
    });
  });

  describe('resolvePath', () => {
    it('should resolve a relative path against a base', () => {
      const result = service.resolvePath('/project', 'src/test.ts');

      expect(result).toBe(path.resolve('/project', 'src/test.ts'));
    });
  });

  describe('findFiles', () => {
    it('should find files matching a pattern recursively', () => {
      fs.mkdirSync(path.join(tmpDir, 'sub'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'app.module.ts'), '');
      fs.writeFileSync(path.join(tmpDir, 'sub', 'other.module.ts'), '');
      fs.writeFileSync(path.join(tmpDir, 'not-a-module.ts'), '');

      const results = service.findFiles(tmpDir, /\.module\.ts$/);

      expect(results).toHaveLength(2);
      expect(results[0]).toContain('app.module.ts');
      expect(results[1]).toContain('other.module.ts');
    });

    it('should return empty array when directory does not exist', () => {
      const results = service.findFiles('/nonexistent', /\.module\.ts$/);

      expect(results).toEqual([]);
    });

    it('should sort results by depth (shallowest first)', () => {
      fs.mkdirSync(path.join(tmpDir, 'a', 'b'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'a', 'b', 'deep.module.ts'), '');
      fs.writeFileSync(path.join(tmpDir, 'shallow.module.ts'), '');

      const results = service.findFiles(tmpDir, /\.module\.ts$/);

      expect(results[0]).toContain('shallow.module.ts');
      expect(results[1]).toContain('deep.module.ts');
    });
  });

  describe('getFileName', () => {
    it('should return the file name from a path', () => {
      expect(service.getFileName('/project/src/app.module.ts')).toBe('app.module.ts');
    });
  });

  describe('relativePath', () => {
    it('should return relative path between two paths', () => {
      const result = service.relativePath('/project/src', '/project/src/modules/test.ts');

      expect(result).toBe(path.join('modules', 'test.ts'));
    });
  });

  describe('dirname', () => {
    it('should return the directory name', () => {
      expect(service.dirname('/project/src/app.module.ts')).toBe('/project/src');
    });
  });
});
