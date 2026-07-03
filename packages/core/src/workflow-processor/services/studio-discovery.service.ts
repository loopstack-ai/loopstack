import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import type { Module } from '@nestjs/core/injector/module.js';
import { ModulesContainer } from '@nestjs/core/injector/modules-container.js';
import { toJSONSchema } from 'zod';
import {
  FEATURE_REGISTRATION_KEY,
  STUDIO_APP_EXTENSION_KEY,
  STUDIO_APP_KEY,
  deriveDocumentIdentifier,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockOptions,
  getRegisteredDocuments,
  getWorkflowIdentifier,
} from '@loopstack/common';
import type { FeatureRegistration, StudioAppExtension, StudioAppMetadata } from '@loopstack/common';
import type { StudioAppConfig, StudioDocumentConfig, StudioWorkflowConfig } from '@loopstack/contracts/api';
import type { JSONSchemaDefinition } from '@loopstack/contracts/schemas';
import type { StaticDocumentMeta, UiFormType } from '@loopstack/contracts/types';

@Injectable()
export class StudioDiscoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StudioDiscoveryService.name);
  private apps: StudioAppConfig[] = [];

  /** Maps workflowName → appName for reverse lookup. */
  private workflowToApp = new Map<string, string>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly modulesContainer: ModulesContainer,
  ) {}

  onApplicationBootstrap(): void {
    const appModules = this.findAppModules();
    this.validateNoNestedStudioApps(appModules);
    const documents = this.discoverDocuments();

    for (const { nestModule, metadata } of appModules) {
      const reachableModules = this.collectReachableModules(nestModule);
      const features = this.discoverFeatures(reachableModules);
      const extensions = this.discoverExtensions(reachableModules);
      const workflows = this.discoverWorkflows(metadata);

      for (const wf of workflows) {
        this.workflowToApp.set(wf.workflowName, metadata.app);
      }

      this.apps.push({
        appName: metadata.app,
        title: metadata.title,
        description: metadata.description,
        ui: metadata.ui,
        features,
        extensions,
        workflows,
        documents,
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

  /**
   * Returns the app name that declares the given workflow,
   * or undefined if the workflow is not declared in any @StudioApp.
   */
  getAppNameForWorkflow(workflowName: string): string | undefined {
    return this.workflowToApp.get(workflowName);
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

  // ── Workflow Discovery ─────────────────────────────────────────────

  private discoverWorkflows(metadata: StudioAppMetadata): StudioWorkflowConfig[] {
    if (!metadata.workflows?.length) return [];

    return metadata.workflows.map((workflowClass) => {
      const options = getBlockOptions(workflowClass);
      const argsSchema = getBlockArgsSchema(workflowClass);
      const jsonSchema = argsSchema ? (toJSONSchema(argsSchema) as JSONSchemaDefinition) : undefined;

      const workflowName = getWorkflowIdentifier(workflowClass);
      return {
        workflowName,
        title: options?.title ?? workflowName,
        description: options?.description,
        schema: jsonSchema,
      };
    });
  }

  // ── Document Discovery ────────────────────────────────────────────

  private discoverDocuments(): StudioDocumentConfig[] {
    const registered = getRegisteredDocuments();
    const documents: StudioDocumentConfig[] = [];

    for (const documentClass of registered) {
      const options = getBlockOptions(documentClass as object);
      const config = getBlockConfig(documentClass as object);
      const contentSchema = getBlockArgsSchema(documentClass as object);
      const jsonSchema = contentSchema ? (toJSONSchema(contentSchema) as JSONSchemaDefinition) : undefined;

      const documentName = options?.name ?? deriveDocumentIdentifier(documentClass.name);

      documents.push({
        documentName,
        title: options?.title,
        description: options?.description,
        ui: config?.ui as UiFormType | undefined,
        tags: options?.tags,
        meta: options?.meta as StaticDocumentMeta | undefined,
        schema: jsonSchema,
      });
    }

    this.logger.log(
      `Discovered ${documents.length} document type(s): ${documents.map((d) => d.documentName).join(', ') || 'none'}`,
    );
    return documents;
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
