import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import { AppInterface, BLOCK_TYPE_METADATA_KEY, WorkflowInterface, getBlockWorkflow } from '@loopstack/common';

@Injectable()
export class BlockDiscoveryService implements OnModuleInit {
  private apps: InstanceWrapper<AppInterface>[] = [];
  private workflows: InstanceWrapper<WorkflowInterface>[] = [];

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit() {
    const providers = this.discovery.getProviders();

    this.apps = providers.filter((wrapper) => {
      const metatype = wrapper.metatype;
      if (!metatype) return false;
      return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, metatype) === 'app';
    }) as InstanceWrapper<AppInterface>[];

    this.workflows = providers.filter((wrapper) => {
      const metatype = wrapper.metatype;
      if (!metatype) return false;
      return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, metatype) === 'workflow';
    }) as InstanceWrapper<WorkflowInterface>[];
  }

  getApps(): AppInterface[] {
    return this.apps.map((wrapper) => wrapper.instance);
  }

  getApp(name: string): AppInterface | undefined {
    const wrapper = this.apps.find((w) => w.name === name);
    return wrapper?.instance;
  }

  getWorkflowByName(name: string): WorkflowInterface | undefined {
    // Try class name first (exact match on provider name)
    const wrapper = this.workflows.find((w) => w.name === name);
    if (wrapper) {
      return wrapper.instance;
    }

    // Fallback: search by property name across all apps and workflows
    for (const app of this.apps) {
      const workflow = getBlockWorkflow<WorkflowInterface>(app.instance, name);
      if (workflow) {
        return workflow;
      }
    }
    for (const wf of this.workflows) {
      const workflow = getBlockWorkflow<WorkflowInterface>(wf.instance, name);
      if (workflow) {
        return workflow;
      }
    }

    return undefined;
  }

  getAllWorkflows(): WorkflowInterface[] {
    return this.workflows.map((wrapper) => wrapper.instance);
  }
}
