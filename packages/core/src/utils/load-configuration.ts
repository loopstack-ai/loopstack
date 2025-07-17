import path from 'path';
import fs from 'fs';
import * as yaml from 'js-yaml';
import { ConfigSourceInterface, MainConfigType } from '@loopstack/shared';

export function loadConfiguration(path: string): ConfigSourceInterface[] {
  const configs: ConfigSourceInterface[] = [];

  try {
    loadConfigsRecursively(path, path, configs);
  } catch (error) {
    console.error(`Error loading config files from ${path}:`, error);
  }

  return configs;
}

function loadConfigsRecursively(
  rootPath: string,
  currentPath: string,
  configs: ConfigSourceInterface[],
): void {
  const items = fs.readdirSync(currentPath);

  items.forEach((item) => {
    const itemPath = path.join(currentPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isFile() && item.endsWith('.yaml')) {
      const config = yaml.load(
        fs.readFileSync(itemPath, 'utf8'),
      ) as MainConfigType;

      const relativePath = path
        .relative(rootPath, itemPath)
        .replace(/\\/g, '/');
      configs.push({
        path: itemPath,
        relativePath,
        config,
      });
    } else if (stats.isDirectory()) {
      loadConfigsRecursively(rootPath, itemPath, configs);
    }
  });
}
