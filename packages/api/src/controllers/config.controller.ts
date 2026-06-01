import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Optional,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { toJSONSchema } from 'zod';
import {
  BLOCK_CONFIG_METADATA_KEY,
  BlockOptions,
  ENVIRONMENT_CONFIG,
  WorkflowInterface,
  buildWorkflowTransitions,
  getBlockArgsSchema,
  getBlockConfig,
} from '@loopstack/common';
import type { AvailableEnvironmentInterface } from '@loopstack/contracts/api';
import { JSONSchemaDefinition } from '@loopstack/contracts/schemas';
import type { WorkflowType } from '@loopstack/contracts/types';
import { StudioDiscoveryService, WorkflowRegistryService } from '@loopstack/core';
import type { StudioAppConfig } from '@loopstack/core';
import { AvailableEnvironmentDto } from '../dtos/available-environment.dto.js';
import { WorkflowConfigDto } from '../dtos/workflow-config.dto.js';
import { WorkflowSourceDto } from '../dtos/workflow-source.dto.js';

interface EnvironmentConfig {
  readonly available: AvailableEnvironmentInterface[];
}

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/config')
export class ConfigController {
  constructor(
    private readonly studioDiscoveryService: StudioDiscoveryService,
    private readonly workflowRegistryService: WorkflowRegistryService,
    @Optional()
    @Inject(ENVIRONMENT_CONFIG)
    private readonly envConfig?: EnvironmentConfig,
  ) {}

  @Get('apps')
  getApps(): StudioAppConfig[] {
    return this.studioDiscoveryService.getApps();
  }

  @Get('environments')
  getAvailableEnvironments(): AvailableEnvironmentDto[] {
    return plainToInstance(AvailableEnvironmentDto, this.envConfig?.available ?? [], {
      excludeExtraneousValues: true,
    });
  }

  private resolveWorkflow(workflowName: string): WorkflowInterface {
    try {
      return this.workflowRegistryService.getByName(workflowName);
    } catch {
      throw new BadRequestException(`Workflow "${workflowName}" not found.`);
    }
  }

  private buildWorkflowConfig(workflow: WorkflowInterface): WorkflowConfigDto {
    const config = getBlockConfig<WorkflowType>(workflow);
    if (!config) {
      throw new Error(`Block ${workflow.constructor.name} is missing @Workflow decorator`);
    }

    const transitions = buildWorkflowTransitions(workflow);
    const argsSchema = getBlockArgsSchema(workflow);
    const argsJsonSchema = argsSchema ? (toJSONSchema(argsSchema) as JSONSchemaDefinition) : undefined;

    return plainToInstance(
      WorkflowConfigDto,
      {
        ...config,
        transitions: transitions.length > 0 ? transitions : (config.transitions ?? []),
        schema: argsJsonSchema,
      },
      { excludeExtraneousValues: true },
    );
  }

  @Get('workflows/:workflowName')
  getWorkflowConfig(@Param('workflowName') workflowName: string): WorkflowConfigDto {
    const workflow = this.resolveWorkflow(workflowName);
    return this.buildWorkflowConfig(workflow);
  }

  @Get('workflows/:workflowName/source')
  getWorkflowSource(@Param('workflowName') workflowName: string): WorkflowSourceDto {
    const workflow = this.resolveWorkflow(workflowName);

    const ctor = workflow.constructor;
    const metadata = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions;

    let raw: string | null = null;
    let filePath: string | null = null;

    if (metadata && typeof metadata.uiConfig === 'string') {
      const yamlPath = metadata.uiConfig;
      const jsPath = yamlPath.replace(/\.ya?ml$/, '.js');
      const mapPath = jsPath + '.map';

      if (fs.existsSync(mapPath)) {
        try {
          const map = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as {
            sources?: string[];
            sourceRoot?: string;
          };
          const source = map.sources?.[0];
          if (source) {
            const resolved = path.resolve(path.dirname(mapPath), map.sourceRoot ?? '', source);
            if (fs.existsSync(resolved)) {
              filePath = resolved;
              raw = fs.readFileSync(resolved, 'utf8');
            }
          }
        } catch {
          // fall through — source map unreadable
        }
      }
    }

    return {
      name: workflowName,
      filePath,
      raw,
    };
  }
}
