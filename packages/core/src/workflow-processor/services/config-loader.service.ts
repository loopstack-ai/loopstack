import { Injectable, Logger } from '@nestjs/common';
import type { ConfigSourceInterface } from '@loopstack/contracts/types';
import path from 'path';
import fs from 'fs';
import { parse } from 'yaml';

@Injectable()
export class ConfigLoaderService {
  private logger = new Logger(ConfigLoaderService.name);

  public loadConfigFile(filePath: string): ConfigSourceInterface | null {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');

      // Parse YAML with error handling
      let config: any;
      try {
        config = parse(raw);
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
