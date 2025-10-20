import { Injectable } from '@nestjs/common';
import { ConfigSourceInterface } from '@loopstack/shared';
import path from 'path';
import fs from 'fs';
import { parse } from 'yaml';

@Injectable()
export class ConfigLoaderService {

  public loadConfigFile(filePath: string): ConfigSourceInterface | null {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');

      // Parse YAML with error handling
      let config: any;
      try {
        config = parse(raw);
      } catch (parseError) {
        console.error(`Error parsing YAML file ${filePath}:`, parseError);
        return null;
      }

      return {
        path: filePath,
        relativePath: path.basename(filePath),
        raw,
        config,
      };
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

}