import path from 'path';
import fs from 'fs';
import * as yaml from 'js-yaml';

export function loadConfiguration(directoryPath: string): any[] {
  const fullPath = path.join(process.cwd(), directoryPath);
  const configs: any[] = [];

  try {
    loadConfigsRecursively(fullPath, configs);
  } catch (error) {
    console.error(`Error loading config files from ${directoryPath}:`, error);
  }

  return configs;
}

function loadConfigsRecursively(currentPath: string, configs: any[]): void {
  const items = fs.readdirSync(currentPath);

  items.forEach((item) => {
    const itemPath = path.join(currentPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isFile() && item.endsWith('.loopstack.yaml')) {
      // Load the config file and add it to the configs array
      const config = yaml.load(fs.readFileSync(itemPath, 'utf8'));
      configs.push(config);
    } else if (stats.isDirectory()) {
      // Recursively process subdirectories
      loadConfigsRecursively(itemPath, configs);
    }
  });
}