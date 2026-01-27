import axios from 'axios';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as path from 'path';
import * as readline from 'readline';

interface AddCommandOptions {
  dir?: string;
}

interface RegistryItem {
  name: string;
  description?: string;
}

@Command({
  name: 'add',
  arguments: '<package>',
  description: 'Add an item from the loopstack registry',
})
export class RegistryAddCommand extends CommandRunner {
  private readonly registryUrl = 'https://loopstack.ai/r/registry.json';

  async run(inputs: string[], options: AddCommandOptions): Promise<void> {
    const [packageArg] = inputs;

    if (!packageArg) {
      console.error('Please specify a package to install');
      console.log('Usage: loopstack add <package>');
      process.exit(1);
    }

    const packageName = this.parsePackageName(packageArg);

    try {
      // Validate package exists in registry
      const registryItem = await this.findRegistryItem(packageName);

      if (!registryItem) {
        console.error(`Package '${packageName}' not found in registry`);
        console.log(`Check available items at: ${this.registryUrl}`);
        process.exit(1);
      }

      // Check if package is already a dependency in local package.json
      if (this.isPackageInLocalPackageJson(packageName)) {
        console.log(`Package '${packageName}' is already installed, skipping npm install.`);
      } else {
        // Install the npm package
        console.log(`Installing ${packageArg}...`);
        this.installPackage(packageArg);
      }

      // Locate the src directory in the installed package
      const srcPath = this.getPackageSrcPath(packageName);

      if (!fs.existsSync(srcPath)) {
        console.error(`Package '${packageName}' does not contain a src directory (${srcPath})`);
        process.exit(1);
      }

      // Prompt for target directory if not provided
      const targetDir = options.dir || (await this.promptForDirectory(packageName));
      const fullTargetPath = path.resolve(process.cwd(), targetDir);

      // Check if directory already exists
      if (fs.existsSync(fullTargetPath)) {
        console.error(`Directory already exists: ${targetDir}`);
        process.exit(1);
      }

      // Copy src contents to target
      fs.mkdirSync(fullTargetPath, { recursive: true });
      this.copyRecursive(srcPath, fullTargetPath);

      console.log(`\nSources copied to: ${targetDir}`);
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

  /**
   * Strips version constraint from package name.
   * Examples:
   *   @loopstack/core-ui-module@rc -> @loopstack/core-ui-module
   *   @loopstack/core-ui-module@1.0.0 -> @loopstack/core-ui-module
   *   lodash@4.17.21 -> lodash
   *   lodash -> lodash
   */
  private parsePackageName(packageArg: string): string {
    // Handle scoped packages (@scope/name@version)
    if (packageArg.startsWith('@')) {
      const withoutScope = packageArg.substring(1);
      const slashIndex = withoutScope.indexOf('/');

      if (slashIndex === -1) {
        // Invalid scoped package, return as-is
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

    // Handle non-scoped packages (name@version)
    const atIndex = packageArg.indexOf('@');

    if (atIndex === -1) {
      return packageArg;
    }

    return packageArg.substring(0, atIndex);
  }

  private async findRegistryItem(packageName: string): Promise<RegistryItem | null> {
    try {
      console.log('Loading registry...');
      const response = await axios.get<RegistryItem[]>(`${this.registryUrl}?package=${packageName}`);
      const registry = response.data;

      // Search for item by name (case-insensitive)
      const item = registry.find((entry) => entry.name.toLowerCase() === packageName.toLowerCase());

      return item || null;
    } catch {
      console.error('Failed to load registry');
      console.log(`Registry URL: ${this.registryUrl}`);
      throw new Error('Could not fetch registry');
    }
  }

  private isPackageInLocalPackageJson(packageName: string): boolean {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
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

  private installPackage(packageArg: string): void {
    try {
      execSync(`npm install ${packageArg}`, {
        stdio: 'inherit',
      });
    } catch {
      throw new Error(`Failed to install package: ${packageArg}`);
    }
  }

  private getPackageSrcPath(packageName: string): string {
    try {
      // Use npm ls --parseable to get the actual installed package path.
      // This reliably finds the package regardless of hoisting in monorepos.
      const result = execSync(`npm ls ${packageName} --parseable`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const paths = result.trim().split('\n').filter(Boolean);

      if (paths.length === 0) {
        throw new Error('Package not found');
      }

      // Use the first path (top-level installation)
      const packageRoot = paths[0];
      return path.join(packageRoot, 'src');
    } catch {
      throw new Error(`Could not resolve package '${packageName}'. Make sure it was installed correctly.`);
    }
  }

  private copyRecursive(src: string, dest: string): void {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private async promptForDirectory(packageName: string): Promise<string> {
    // Extract just the package name without scope for default directory
    const simpleName = packageName.startsWith('@') ? packageName.split('/')[1] || packageName : packageName;
    const defaultDir = `src/${simpleName}`;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(`Install directory [${defaultDir}]: `, (answer) => {
        rl.close();
        const dir = answer.trim() || defaultDir;
        resolve(dir);
      });
    });
  }
}
