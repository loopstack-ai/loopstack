import path from 'path';
import fs from 'fs';
import { parse } from 'yaml';
import { ConfigSourceInterface, MainConfigType } from '@loopstack/shared';

export function loadConfiguration(configPath: string): ConfigSourceInterface[] {
  const configs: ConfigSourceInterface[] = [];

  // Ensure we have an absolute path for consistent behavior across platforms
  const resolvedPath = path.resolve(configPath);

  try {
    // Verify the root path exists and is accessible
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Configuration path does not exist: ${resolvedPath}`);
      return configs;
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      console.error(`Configuration path is not a directory: ${resolvedPath}`);
      return configs;
    }

    loadConfigsRecursively(resolvedPath, resolvedPath, configs);
  } catch (error) {
    console.error(`Error loading config files from ${configPath}:`, error);
  }

  return configs;
}

function loadConfigsRecursively(
  rootPath: string,
  currentPath: string,
  configs: ConfigSourceInterface[],
): void {
  let items: string[];

  try {
    items = fs.readdirSync(currentPath);
  } catch (error) {
    console.error(`Cannot read directory ${currentPath}:`, error);
    return;
  }

  items.forEach((item) => {
    const itemPath = path.join(currentPath, item);

    let stats: fs.Stats;
    try {
      stats = fs.statSync(itemPath);
    } catch (error) {
      console.warn(`Cannot access ${itemPath}:`, error);
      return;
    }

    // Handle files with .yaml or .yml extensions (case-insensitive for Windows compatibility)
    if (stats.isFile() && (item.toLowerCase().endsWith('.yaml') || item.toLowerCase().endsWith('.yml'))) {
      try {
        const raw = fs.readFileSync(itemPath, 'utf8');

        // Parse YAML with error handling
        let config: any;
        try {
          config = parse(raw);
        } catch (parseError) {
          console.error(`Error parsing YAML file ${itemPath}:`, parseError);
          return;
        }

        // Create cross-platform relative path using forward slashes
        const relativePath = path.relative(rootPath, itemPath)
          .split(path.sep)
          .join('/');

        configs.push({
          path: itemPath,
          relativePath,
          raw,
          config,
        });

        console.log(`Loaded config: ${relativePath}`);
      } catch (error) {
        console.error(`Error processing file ${itemPath}:`, error);
      }
    } else if (stats.isDirectory()) {
      // Recursively process subdirectories
      try {
        loadConfigsRecursively(rootPath, itemPath, configs);
      } catch (error) {
        console.error(`Error processing directory ${itemPath}:`, error);
      }
    }
  });
}