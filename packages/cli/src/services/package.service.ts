import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { LoopstackModuleConfig } from './module-installer.service';

const LOOPSTACK_MODULE_CONFIG_FILE = 'loopstack-module.json';

@Injectable()
export class PackageService {
  /**
   * Strips version constraint from package name.
   * Examples:
   *   @loopstack/core-ui-module@rc -> @loopstack/core-ui-module
   *   @loopstack/core-ui-module@1.0.0 -> @loopstack/core-ui-module
   *   lodash@4.17.21 -> lodash
   *   lodash -> lodash
   */
  parsePackageName(packageArg: string): string {
    if (packageArg.startsWith('@')) {
      const withoutScope = packageArg.substring(1);
      const slashIndex = withoutScope.indexOf('/');

      if (slashIndex === -1) {
        return packageArg;
      }

      const scope = withoutScope.substring(0, slashIndex);
      const rest = withoutScope.substring(slashIndex + 1);
      const atIndex = rest.indexOf('@');

      if (atIndex === -1) {
        return packageArg;
      }

      return `@${scope}/${rest.substring(0, atIndex)}`;
    }

    const atIndex = packageArg.indexOf('@');

    if (atIndex === -1) {
      return packageArg;
    }

    return packageArg.substring(0, atIndex);
  }

  /**
   * Extracts the simple name (without scope) from a package name.
   */
  getSimpleName(packageName: string): string {
    return packageName.startsWith('@') ? packageName.split('/')[1] || packageName : packageName;
  }

  isInstalled(packageName: string, cwd: string = process.cwd()): boolean {
    try {
      const packageJsonPath = path.join(cwd, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      return !!(pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName]);
    } catch {
      return false;
    }
  }

  install(packageArg: string): void {
    try {
      execSync(`npm install ${packageArg}`, {
        stdio: 'inherit',
      });
    } catch {
      throw new Error(`Failed to install package: ${packageArg}`);
    }
  }

  getSrcPath(packageName: string): string {
    const packageRoot = this.getPackageRoot(packageName);
    return path.join(packageRoot, 'src');
  }

  getPackageRoot(packageName: string): string {
    try {
      const result = execSync(`npm ls ${packageName} --parseable`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const paths = result.trim().split('\n').filter(Boolean);

      if (paths.length === 0) {
        throw new Error('Package not found');
      }

      return paths[0];
    } catch {
      throw new Error(`Could not resolve package '${packageName}'. Make sure it was installed correctly.`);
    }
  }

  getModuleConfig(packageName: string): LoopstackModuleConfig | null {
    const packageRoot = this.getPackageRoot(packageName);
    const configPath = path.join(packageRoot, LOOPSTACK_MODULE_CONFIG_FILE);

    if (!fs.existsSync(configPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as LoopstackModuleConfig;
    } catch {
      throw new Error(`Failed to parse ${LOOPSTACK_MODULE_CONFIG_FILE} in package '${packageName}'`);
    }
  }

  hasScript(scriptName: string, cwd: string = process.cwd()): boolean {
    try {
      const packageJsonPath = path.join(cwd, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
        scripts?: Record<string, string>;
      };
      return !!pkg.scripts?.[scriptName];
    } catch {
      return false;
    }
  }

  runScript(scriptName: string, cwd: string = process.cwd()): void {
    try {
      execSync(`npm run ${scriptName}`, {
        cwd,
        stdio: 'inherit',
      });
    } catch {
      throw new Error(`Failed to run script: ${scriptName}`);
    }
  }
}
