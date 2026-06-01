import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import type { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import type { Module } from '@nestjs/core/injector/module.js';
import { ModulesContainer } from '@nestjs/core/injector/modules-container.js';
import { toJSONSchema, type z } from 'zod';
import {
  FEATURE_REGISTRATION_KEY,
  STUDIO_APP_EXTENSION_KEY,
  STUDIO_APP_KEY,
  STUDIO_CONTROLLER_KEY,
  STUDIO_ENDPOINT_KEY,
} from '@loopstack/common';
import type {
  FeatureRegistration,
  StudioAppExtension,
  StudioAppMetadata,
  StudioControllerOptions,
  StudioEndpointMeta,
  StudioUiConfig,
} from '@loopstack/common';
import type { JSONSchemaDefinition } from '@loopstack/contracts/schemas';

export interface StudioAppConfig {
  appName: string;
  title: string;
  description?: string;
  ui?: StudioUiConfig;
  features: FeatureRegistration[];
  extensions: Record<string, unknown[]>;
  controllers: StudioControllerConfig[];
}

export interface StudioControllerConfig {
  title?: string;
  description?: string;
  endpoints: StudioEndpointConfig[];
}

export interface StudioEndpointConfig {
  path: string;
  method: string;
  title: string;
  description?: string;
  workflowName: string;
  schema?: JSONSchemaDefinition;
}

@Injectable()
export class StudioDiscoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StudioDiscoveryService.name);
  private apps: StudioAppConfig[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly modulesContainer: ModulesContainer,
  ) {}

  onApplicationBootstrap(): void {
    const appModules = this.findAppModules();
    this.validateNoNestedStudioApps(appModules);

    for (const { nestModule, metadata } of appModules) {
      const reachableModules = this.collectReachableModules(nestModule);
      const controllers = this.discoverControllers(reachableModules);
      const features = this.discoverFeatures(reachableModules);
      const extensions = this.discoverExtensions(reachableModules);

      this.apps.push({
        appName: metadata.app,
        title: metadata.title,
        description: metadata.description,
        ui: metadata.ui,
        features,
        extensions,
        controllers,
      });
    }

    this.logger.log(
      `Discovered ${this.apps.length} studio app(s): ${this.apps.map((a) => a.appName).join(', ') || 'none'}`,
    );
  }

  getApps(): StudioAppConfig[] {
    return this.apps;
  }

  getApp(appName: string): StudioAppConfig | undefined {
    return this.apps.find((a) => a.appName === appName);
  }

  getAppNames(): string[] {
    return this.apps.map((a) => a.appName);
  }

  // ── Module Discovery ────────────────────────────────────────────────

  private findAppModules(): { nestModule: Module; metadata: StudioAppMetadata }[] {
    const result: { nestModule: Module; metadata: StudioAppMetadata }[] = [];

    for (const nestModule of this.modulesContainer.values()) {
      const metadata = Reflect.getMetadata(STUDIO_APP_KEY, nestModule.metatype) as StudioAppMetadata | undefined;
      if (metadata) {
        result.push({ nestModule, metadata });
      }
    }

    return result;
  }

  /**
   * Returns the app module itself plus its direct imports.
   */
  private collectReachableModules(root: Module): Module[] {
    const visited = new Set<Module>();
    const queue: Module[] = [root];

    while (queue.length > 0) {
      const current = queue.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const imported of current.imports) {
        if (!visited.has(imported)) {
          queue.push(imported);
        }
      }
    }

    return [...visited];
  }

  /**
   * Validates that no @StudioApp module imports another @StudioApp module.
   */
  private validateNoNestedStudioApps(appModules: { nestModule: Module; metadata: StudioAppMetadata }[]): void {
    const appModuleSet = new Set(appModules.map((a) => a.nestModule));

    for (const { nestModule, metadata } of appModules) {
      for (const imported of nestModule.imports) {
        if (appModuleSet.has(imported)) {
          const importedName = imported.metatype?.name ?? 'unknown';
          throw new Error(
            `@StudioApp "${metadata.app}" imports another @StudioApp module "${importedName}". ` +
              `Studio apps must not be nested — import them independently in your root module.`,
          );
        }
      }
    }
  }

  // ── Controller & Endpoint Discovery ─────────────────────────────────

  private discoverControllers(modules: Module[]): StudioControllerConfig[] {
    const result: StudioControllerConfig[] = [];

    for (const nestModule of modules) {
      for (const wrapper of nestModule.controllers.values()) {
        if (!wrapper.metatype || !wrapper.instance) continue;

        const controllerMeta = Reflect.getMetadata(STUDIO_CONTROLLER_KEY, wrapper.metatype) as
          | StudioControllerOptions
          | undefined;
        if (!controllerMeta) continue;

        const endpoints = this.discoverEndpoints(wrapper);

        result.push({
          title: controllerMeta.title,
          description: controllerMeta.description,
          endpoints,
        });
      }
    }

    return result;
  }

  private discoverEndpoints(wrapper: InstanceWrapper): StudioEndpointConfig[] {
    const prototype = wrapper.metatype!.prototype as Record<string, unknown>;
    const controllerPath = (Reflect.getMetadata('path', wrapper.metatype!) as string) ?? '';
    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      (name) => name !== 'constructor' && typeof prototype[name] === 'function',
    );

    const endpoints: StudioEndpointConfig[] = [];

    for (const methodName of methodNames) {
      const endpointMeta = Reflect.getMetadata(STUDIO_ENDPOINT_KEY, prototype, methodName) as
        | StudioEndpointMeta
        | undefined;
      if (!endpointMeta) continue;

      const methodPath = (Reflect.getMetadata('path', prototype[methodName] as object) as string) ?? '';
      const httpMethod = (Reflect.getMetadata('method', prototype[methodName] as object) as number) ?? 0;

      const httpMethodNames = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'ALL'];
      const methodString = httpMethodNames[httpMethod] ?? 'POST';

      const pathSegments = [controllerPath, methodPath].filter(Boolean);
      const fullPath = '/' + pathSegments.join('/');

      if (endpointMeta.kind === 'multi') {
        for (const wf of endpointMeta.workflows) {
          const jsonSchema = wf.schema ? (toJSONSchema(wf.schema) as JSONSchemaDefinition) : undefined;
          // Replace :workflowName param placeholder with the actual workflow identifier
          const resolvedPath = fullPath.replace(':workflowName', wf.identifier);

          endpoints.push({
            path: resolvedPath,
            method: methodString,
            title: wf.identifier,
            description: endpointMeta.description,
            workflowName: wf.workflowClass.name,
            schema: jsonSchema,
          });
        }
      } else {
        const jsonSchema = endpointMeta.schema
          ? (toJSONSchema(endpointMeta.schema) as JSONSchemaDefinition)
          : undefined;

        endpoints.push({
          path: fullPath,
          method: methodString,
          title: endpointMeta.title,
          description: endpointMeta.description,
          workflowName: endpointMeta.workflowClass.name,
          schema: jsonSchema,
        });
      }
    }

    return endpoints;
  }

  // ── Feature Discovery ───────────────────────────────────────────────

  private discoverFeatures(modules: Module[]): FeatureRegistration[] {
    const features: FeatureRegistration[] = [];

    for (const nestModule of modules) {
      for (const wrapper of nestModule.providers.values()) {
        if (!wrapper.metatype) continue;

        const meta = Reflect.getMetadata(FEATURE_REGISTRATION_KEY, wrapper.metatype) as FeatureRegistration | undefined;
        if (!meta) continue;

        // Deduplicate by feature id
        if (!features.some((f) => f.id === meta.id)) {
          features.push(meta);
        }
      }
    }

    return features;
  }

  // ── Extension Discovery ─────────────────────────────────────────────

  private discoverExtensions(modules: Module[]): Record<string, unknown[]> {
    const extensions: Record<string, unknown[]> = {};

    for (const nestModule of modules) {
      for (const wrapper of nestModule.providers.values()) {
        if (!wrapper.metatype) continue;

        const meta = Reflect.getMetadata(STUDIO_APP_EXTENSION_KEY, wrapper.metatype) as StudioAppExtension | undefined;
        if (!meta) continue;

        if (!extensions[meta.section]) {
          extensions[meta.section] = [];
        }
        extensions[meta.section].push(meta.data);
      }
    }

    return extensions;
  }
}
