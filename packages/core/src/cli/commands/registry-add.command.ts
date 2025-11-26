import { Command, CommandRunner, Option } from 'nest-commander';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import axios from 'axios';

interface AddCommandOptions {
  dir?: string;
  skipDeps?: boolean;
  packageManager?: 'npm' | 'pnpm';
}

interface RegistryItem {
  name: string;
  repo: string;
  description?: string;
}

@Command({
  name: 'registry:add',
  arguments: '<item>',
  description: 'Add an item from the loopstack registry',
})
export class RegistryAddCommand extends CommandRunner {
  private readonly registryUrl = 'https://r.loopstack.ai/registry.json';
  private readonly tempDir = '.loopstack/tmp';

  async run(inputs: string[], options: AddCommandOptions): Promise<void> {
    const [item] = inputs;

    if (!item) {
      console.error('Please specify an item to install');
      console.log('Usage: loopstack registry:add <item>');
      process.exit(1);
    }

    const originalDir = process.cwd();

    try {
      // Load registry and find item
      const registryItem = await this.findRegistryItem(item);

      if (!registryItem) {
        console.error(`Item '${item}' not found in registry`);
        console.log(`Check available items at: ${this.registryUrl}`);
        process.exit(1);
      }

      // Prompt for target directory if not provided
      const targetDir =
        options.dir || (await this.promptForDirectory(item));
      const fullTargetPath = path.resolve(originalDir, targetDir);

      // Check if directory already exists
      if (fs.existsSync(fullTargetPath)) {
        console.error(`Directory already exists: ${targetDir}`);
        process.exit(1);
      }

      // Create temp directory
      const tempId = `${item}-${Date.now()}`;
      const tempPath = path.resolve(originalDir, this.tempDir, tempId);

      try {
        fs.mkdirSync(tempPath, { recursive: true });
      } catch (error) {
        console.error('Failed to create temp directory');
        process.exit(1);
      }

      try {
        // Clone to temp directory using the repo URL from registry
        await this.cloneItem(registryItem.repo, tempPath);

        // Check if src directory exists in temp
        const tempSrcPath = path.join(tempPath, 'src');
        const sourceToMove = fs.existsSync(tempSrcPath)
          ? tempSrcPath
          : tempPath;

        // Copy to target
        fs.mkdirSync(fullTargetPath, { recursive: true });
        this.copyRecursive(sourceToMove, fullTargetPath);

        // Handle dependencies
        const packageJsonPath = path.join(tempPath, 'package.json');

        if (fs.existsSync(packageJsonPath) && !options.skipDeps) {
          await this.handleDependencies(
            packageJsonPath,
            originalDir,
            options.packageManager,
          );
        }

        console.log(`\nInstalled to: ${targetDir}`);
      } catch (error) {
        console.error('Failed to copy source');
        console.log('Possible reasons:');
        console.log('  - Item does not exist in registry');
        console.log('  - Network connection issue');
        console.log(`  - Invalid repo URL: ${registryItem.repo}`);
        process.exit(1);
      } finally {
        // Cleanup temp directory
        this.cleanup(tempPath);
      }
    } catch (error) {
      console.error(error.message);
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
    flags: '--skip-deps',
    description: 'Skip dependency installation',
  })
  parseSkipDeps(): boolean {
    return true;
  }

  @Option({
    flags: '-pm, --package-manager <manager>',
    description: 'Package manager to use (npm or pnpm)',
  })
  parsePackageManager(val: string): 'npm' | 'pnpm' {
    if (val !== 'npm' && val !== 'pnpm') {
      throw new Error('Package manager must be npm or pnpm');
    }
    return val as 'npm' | 'pnpm';
  }

  private async findRegistryItem(itemName: string): Promise<RegistryItem | null> {
    try {
      console.log('Loading registry...');
      const response = await axios.get<RegistryItem[]>(this.registryUrl);
      const registry = response.data;

      // Search for item by name (case-insensitive)
      const item = registry.find(
        (entry) => entry.name.toLowerCase() === itemName.toLowerCase()
      );

      return item || null;
    } catch (error) {
      console.error('Failed to load registry');
      console.log(`Registry URL: ${this.registryUrl}`);
      throw new Error('Could not fetch registry');
    }
  }

  private async cloneItem(repoUrl: string, targetPath: string): Promise<void> {
    try {
      execSync(`npx degit ${repoUrl} "${targetPath}"`, {
        stdio: 'inherit',
      });
    } catch (error) {
      throw new Error(`Failed to clone from ${repoUrl}`);
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

  private cleanup(tempPath: string): void {
    try {
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async handleDependencies(
    packageJsonPath: string,
    installDir: string,
    packageManager?: 'npm' | 'pnpm',
  ): Promise<void> {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};
    const allDeps = { ...deps, ...devDeps };

    if (Object.keys(allDeps).length === 0) {
      return;
    }

    console.log('\nDependencies:');
    Object.entries(allDeps).forEach(([name, version]) => {
      console.log(`  ${name}@${version}`);
    });

    const shouldAdd = await this.promptForAddDependencies();

    if (shouldAdd) {
      const pm = packageManager || (await this.promptForPackageManager());

      try {
        process.chdir(installDir);

        // Add dependencies
        const depsList = Object.entries(deps).map(
          ([name, version]) => `${name}@${version}`,
        );

        const devDepsList = Object.entries(devDeps).map(
          ([name, version]) => `${name}@${version}`,
        );

        if (depsList.length > 0) {
          console.log('\nAdding dependencies to package.json...');
          const command = this.getAddCommand(pm, depsList.join(' '), false);
          execSync(command, { stdio: 'inherit' });
        }

        if (devDepsList.length > 0) {
          console.log('Adding dev dependencies to package.json...');
          const command = this.getAddCommand(pm, devDepsList.join(' '), true);
          execSync(command, { stdio: 'inherit' });
        }

        console.log('\nDependencies added to package.json');
        console.log(`Run '${this.getInstallCommand(pm)}' to install them`);
      } catch (error) {
        console.warn('Failed to add dependencies');
        const packages = Object.entries(allDeps)
          .map(([name, version]) => `${name}@${version}`)
          .join(' ');
        console.log(
          `You can add them manually: npm install --save ${packages} --package-lock-only`,
        );
      }
    } else {
      const packages = Object.entries(allDeps)
        .map(([name, version]) => `${name}@${version}`)
        .join(' ');
      console.log(
        `\nTo add dependencies: npm install --save ${packages} --package-lock-only`,
      );
    }
  }

  private async promptForDirectory(item: string): Promise<string> {
    const defaultDir = `src/packages/${item}`;

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

  private async promptForAddDependencies(): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question('\nAdd dependencies to package.json? [Y/n]: ', (answer) => {
        rl.close();
        const response = answer.trim().toLowerCase();
        resolve(response === '' || response === 'y' || response === 'yes');
      });
    });
  }

  private async promptForPackageManager(): Promise<'npm' | 'pnpm'> {
    const detectedPM = this.detectPackageManager();
    const defaultPM = detectedPM || 'npm';

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      const prompt = detectedPM
        ? `Package manager (detected: ${detectedPM}) [${defaultPM}]: `
        : `Package manager [${defaultPM}]: `;

      rl.question(prompt, (answer) => {
        rl.close();
        const pm = answer.trim().toLowerCase() || defaultPM;

        if (pm !== 'npm' && pm !== 'pnpm') {
          console.log(
            `WARNING: Unsupported package manager '${pm}', using ${defaultPM}`,
          );
          resolve(defaultPM as 'npm' | 'pnpm');
        } else {
          resolve(pm as 'npm' | 'pnpm');
        }
      });
    });
  }

  private detectPackageManager(): 'npm' | 'pnpm' | null {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      if (fs.existsSync(path.join(currentDir, 'pnpm-lock.yaml'))) {
        return 'pnpm';
      }
      if (fs.existsSync(path.join(currentDir, 'package-lock.json'))) {
        return 'npm';
      }

      currentDir = path.dirname(currentDir);
    }

    // Check which package managers are available
    if (this.isPackageManagerAvailable('pnpm')) {
      return 'pnpm';
    }

    return null;
  }

  private isPackageManagerAvailable(pm: string): boolean {
    try {
      execSync(`${pm} --version`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private getAddCommand(
    pm: 'npm' | 'pnpm',
    packages: string,
    isDev: boolean,
  ): string {
    if (pm === 'npm') {
      const flag = isDev ? '--save-dev' : '--save';
      return `npm install ${flag} ${packages} --package-lock-only`;
    } else if (pm === 'pnpm') {
      const flag = isDev ? '--save-dev' : '--save-prod';
      return `pnpm add ${packages} ${flag} --lockfile-only`;
    }

    return `npm install --save ${packages} --package-lock-only`;
  }

  private getInstallCommand(pm: 'npm' | 'pnpm'): string {
    return pm === 'npm' ? 'npm install' : 'pnpm install';
  }
}