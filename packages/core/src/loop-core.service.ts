import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { MainConfigInterface } from '@loopstack/shared/dist/schemas/main.schema';
import { InitService } from './configuration/services/init.service';
import { MODULE_OPTIONS_TOKEN } from './loop-core.module-definition';
import { ModuleOptionsInterface } from './interfaces/module-options.interface';
import path from 'path';
import fs from 'fs';
import * as yaml from 'js-yaml';

@Injectable()
export class LoopCoreService implements OnApplicationBootstrap {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private options: ModuleOptionsInterface,
    private initService: InitService,
  ) {}

  loadConfigFilesUtil(directoryPath: string): any[] {
    const configs: any = [];
    try {
      const absolutePath = path.resolve(directoryPath);
      const files = fs.readdirSync(absolutePath);

      files.forEach((file) => {
        const filePath = path.join(absolutePath, file);
        if (
          fs.statSync(filePath).isFile() &&
          file.endsWith('.loopstack.yaml')
        ) {
          configs.push(yaml.load(fs.readFileSync(filePath, 'utf8')));
        }
      });
    } catch (error) {
      console.error(`Error loading config files from ${directoryPath}:`, error);
    }

    return configs;
  }

  onApplicationBootstrap() {
    const fullPath = path.join(process.cwd(), this.options.configFilePath);
    const configs: MainConfigInterface[] = [];
    const customConfig = this.loadConfigFilesUtil(fullPath);
    configs.push(...customConfig);

    this.initService.clear();
    for (const config of configs) {
      this.initService.createFromConfig(config);
    }
  }
}
