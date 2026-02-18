import * as child_process from 'child_process';
import * as fs from 'fs';
import { PackageService } from '../package.service';

jest.mock('fs');
jest.mock('child_process');

const mockedFs = jest.mocked(fs);
const mockedExecSync = jest.mocked(child_process.execSync);

describe('PackageService', () => {
  let service: PackageService;

  beforeEach(() => {
    service = new PackageService();
    jest.clearAllMocks();
  });

  describe('parsePackageName', () => {
    it('should return scoped package name without version', () => {
      expect(service.parsePackageName('@loopstack/core-ui-module@rc')).toBe('@loopstack/core-ui-module');
    });

    it('should return scoped package name without semver version', () => {
      expect(service.parsePackageName('@loopstack/core-ui-module@1.0.0')).toBe('@loopstack/core-ui-module');
    });

    it('should return scoped package name when no version is specified', () => {
      expect(service.parsePackageName('@loopstack/core-ui-module')).toBe('@loopstack/core-ui-module');
    });

    it('should return unscoped package name without version', () => {
      expect(service.parsePackageName('lodash@4.17.21')).toBe('lodash');
    });

    it('should return unscoped package name when no version is specified', () => {
      expect(service.parsePackageName('lodash')).toBe('lodash');
    });

    it('should handle scoped package without slash', () => {
      expect(service.parsePackageName('@loopstack')).toBe('@loopstack');
    });
  });

  describe('getSimpleName', () => {
    it('should extract name from scoped package', () => {
      expect(service.getSimpleName('@loopstack/oauth-module')).toBe('oauth-module');
    });

    it('should return unscoped package name as-is', () => {
      expect(service.getSimpleName('lodash')).toBe('lodash');
    });
  });

  describe('isInstalled', () => {
    it('should return true when package is in dependencies', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ dependencies: { '@loopstack/test': '^1.0.0' } }));

      expect(service.isInstalled('@loopstack/test', '/project')).toBe(true);
    });

    it('should return true when package is in devDependencies', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ devDependencies: { '@loopstack/test': '^1.0.0' } }));

      expect(service.isInstalled('@loopstack/test', '/project')).toBe(true);
    });

    it('should return false when package is not installed', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ dependencies: {} }));

      expect(service.isInstalled('@loopstack/test', '/project')).toBe(false);
    });

    it('should return false when package.json does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(service.isInstalled('@loopstack/test', '/project')).toBe(false);
    });
  });

  describe('install', () => {
    it('should run npm install', () => {
      service.install('@loopstack/test@1.0.0');

      expect(mockedExecSync).toHaveBeenCalledWith('npm install @loopstack/test@1.0.0', { stdio: 'inherit' });
    });

    it('should throw on install failure', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('npm error');
      });

      expect(() => service.install('bad-package')).toThrow('Failed to install package: bad-package');
    });
  });

  describe('getSrcPath', () => {
    it('should return src directory under package root', () => {
      mockedExecSync.mockReturnValue('/node_modules/@loopstack/test\n' as any);

      const result = service.getSrcPath('@loopstack/test');

      expect(result).toContain('src');
    });
  });

  describe('getPackageRoot', () => {
    it('should return the package root from npm ls', () => {
      mockedExecSync.mockReturnValue('/node_modules/@loopstack/test\n' as any);

      const result = service.getPackageRoot('@loopstack/test');

      expect(result).toBe('/node_modules/@loopstack/test');
    });

    it('should throw when package cannot be resolved', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      expect(() => service.getPackageRoot('@loopstack/missing')).toThrow(
        "Could not resolve package '@loopstack/missing'",
      );
    });
  });

  describe('getModuleConfig', () => {
    it('should return loopstack config from package.json', () => {
      mockedExecSync.mockReturnValue('/node_modules/@loopstack/test\n' as any);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          loopstack: {
            modules: [{ path: 'src/test.module.ts', className: 'TestModule' }],
          },
        }),
      );

      const result = service.getModuleConfig('@loopstack/test');

      expect(result).toEqual({
        modules: [{ path: 'src/test.module.ts', className: 'TestModule' }],
      });
    });

    it('should return null when no loopstack config exists', () => {
      mockedExecSync.mockReturnValue('/node_modules/@loopstack/test\n' as any);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = service.getModuleConfig('@loopstack/test');

      expect(result).toBeNull();
    });
  });

  describe('hasScript', () => {
    it('should return true when script exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ scripts: { format: 'prettier --write .' } }));

      expect(service.hasScript('format', '/project')).toBe(true);
    });

    it('should return false when script does not exist', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ scripts: {} }));

      expect(service.hasScript('format', '/project')).toBe(false);
    });
  });

  describe('runScript', () => {
    it('should run npm script', () => {
      service.runScript('format', '/project');

      expect(mockedExecSync).toHaveBeenCalledWith('npm run format', { cwd: '/project', stdio: 'inherit' });
    });

    it('should throw on script failure', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('script error');
      });

      expect(() => service.runScript('format', '/project')).toThrow('Failed to run script: format');
    });
  });
});
