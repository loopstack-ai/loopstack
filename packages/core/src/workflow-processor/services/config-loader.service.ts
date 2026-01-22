import { Injectable, Logger } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import type { BlockConfigType, ConfigSourceInterface } from '@loopstack/contracts/types';

@Injectable()
export class ConfigLoaderService {
  private logger = new Logger(ConfigLoaderService.name);

  public loadConfigFile(filePath: string): ConfigSourceInterface | null {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');

      // Parse YAML with error handling
      let config: Partial<BlockConfigType>;
      try {
        config = parse(raw) as Partial<BlockConfigType>;
      } catch (parseError) {
        this.logger.error(`Error parsing YAML file ${filePath}:`, parseError);
        return null;
      }

      return {
        path: filePath,
        relativePath: path.basename(filePath),
        raw,
        config,
      };
    } catch (error) {
      this.logger.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }
}
