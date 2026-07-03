import { BadRequestException, Controller, Get, Inject, Optional, Param } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { toJSONSchema, z } from 'zod';
import {
  BLOCK_CONFIG_METADATA_KEY,
  BlockOptions,
  ENVIRONMENT_CONFIG,
  WorkflowInterface,
  buildWorkflowTransitions,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockName,
} from '@loopstack/common';
import {
  AvailableEnvironmentInterface,
  AvailableEnvironmentSchema,
  StudioAppConfig,
  StudioAppConfigSchema,
  ToolConfigInterface,
  ToolConfigSchema,
  WorkflowConfigInterface,
  WorkflowConfigSchema,
  WorkflowSourceInterface,
  WorkflowSourceSchema,
} from '@loopstack/contracts/api';
import { JSONSchemaDefinition } from '@loopstack/contracts/schemas';
import type { ToolConfigType, WorkflowType } from '@loopstack/contracts/types';
import { StudioDiscoveryService, ToolRegistryService, WorkflowRegistryService } from '@loopstack/core';
import { assertResponse } from '../mappers/assert-response.util.js';

interface EnvironmentConfig {
  readonly available: AvailableEnvironmentInterface[];
}

@Controller('api/v1/config')
export class ConfigController {
  constructor(
    private readonly studioDiscoveryService: StudioDiscoveryService,
    private readonly workflowRegistryService: WorkflowRegistryService,
    private readonly toolRegistryService: ToolRegistryService,
    @Optional()
    @Inject(ENVIRONMENT_CONFIG)
    private readonly envConfig?: EnvironmentConfig,
  ) {}

  @Get('apps')
  getApps(): StudioAppConfig[] {
    return assertResponse(z.array(StudioAppConfigSchema), this.studioDiscoveryService.getApps());
  }

  @Get('environments')
  getAvailableEnvironments(): AvailableEnvironmentInterface[] {
    return (this.envConfig?.available ?? []).map((env) =>
      assertResponse(AvailableEnvironmentSchema, {
        type: env.type,
        name: env.name,
        connectionUrl: env.connectionUrl,
        agentUrl: env.agentUrl,
        local: env.local,
      }),
    );
  }

  private resolveWorkflow(workflowName: string): WorkflowInterface {
    try {
      return this.workflowRegistryService.resolve(workflowName).instance;
    } catch {
      throw new BadRequestException(`Workflow "${workflowName}" not found.`);
    }
  }

  private buildWorkflowConfig(workflowName: string, workflow: WorkflowInterface): WorkflowConfigInterface {
    const config = getBlockConfig<WorkflowType>(workflow);
    if (!config) {
      throw new Error(`Block ${workflow.constructor.name} is missing @Workflow decorator`);
    }

    const transitions = buildWorkflowTransitions(workflow);
    const argsSchema = getBlockArgsSchema(workflow);
    const argsJsonSchema = argsSchema ? (toJSONSchema(argsSchema) as JSONSchemaDefinition) : undefined;

    return assertResponse(WorkflowConfigSchema, {
      workflowName,
      title: config.title,
      description: config.description,
      schema: argsJsonSchema,
      ui: config.ui,
      transitions: transitions.length > 0 ? transitions : (config.transitions ?? []),
    });
  }

  @Get('tools')
  getToolConfigs(): ToolConfigInterface[] {
    return this.toolRegistryService.getAll().map((tool) => this.buildToolConfig(tool));
  }

  @Get('tools/:toolName')
  getToolConfig(@Param('toolName') toolName: string): ToolConfigInterface {
    try {
      const tool = this.toolRegistryService.get(toolName);
      return this.buildToolConfig(tool);
    } catch {
      throw new BadRequestException(`Tool "${toolName}" not found.`);
    }
  }

  private buildToolConfig(tool: object): ToolConfigInterface {
    const config = getBlockConfig<ToolConfigType>(tool);
    const name = getBlockName(tool);

    return assertResponse(ToolConfigSchema, {
      name,
      description: config?.description,
      ui: config?.ui,
    });
  }

  @Get('workflows/:workflowName')
  getWorkflowConfig(@Param('workflowName') workflowName: string): WorkflowConfigInterface {
    const workflow = this.resolveWorkflow(workflowName);
    return this.buildWorkflowConfig(workflowName, workflow);
  }

  @Get('workflows/:workflowName/source')
  getWorkflowSource(@Param('workflowName') workflowName: string): WorkflowSourceInterface {
    const workflow = this.resolveWorkflow(workflowName);

    const ctor = workflow.constructor;
    const metadata = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions;

    let raw: string | null = null;
    let filePath: string | null = null;

    const widgetPath = metadata?.widget
      ? typeof metadata.widget === 'string'
        ? metadata.widget
        : Array.isArray(metadata.widget)
          ? (metadata.widget.find((w): w is string => typeof w === 'string') ?? null)
          : null
      : null;

    if (widgetPath) {
      const yamlPath = widgetPath;
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

    return assertResponse(WorkflowSourceSchema, {
      name: workflowName,
      filePath,
      raw,
    });
  }
}
