import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { BlockConfigType, type ConfigSourceInterface } from '@loopstack/contracts/types';
import { BlockOptions } from '../decorators';

export function buildConfig(options: BlockOptions, type?: string): BlockConfigType {
  const baseConfig: Partial<BlockConfigType> = {
    ...options.config,
  };

  if (options.uiConfig) {
    const configSource = loadConfigFile(options.uiConfig);
    if (!configSource) {
      throw new Error(`Could not load config source ${options.uiConfig}`);
    }

    Object.assign(baseConfig, configSource.config);
  }

  if (type) {
    baseConfig.type = type as BlockConfigType['type'];
  }

  return {
    type: baseConfig.type ?? 'undefined',
    description: baseConfig.description ?? '',
    ...baseConfig,
  } as BlockConfigType;
}

function loadConfigFile(filePath: string): ConfigSourceInterface | null {
  const raw = fs.readFileSync(filePath, 'utf8');

  const config = parse(raw) as Partial<BlockConfigType>;

  return {
    path: filePath,
    relativePath: path.basename(filePath),
    raw,
    config,
  };
}
