import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { BLOCK_TYPE_METADATA_KEY, WorkflowInterface, WorkspaceInterface, getBlockWorkflow } from '@loopstack/common';

@Injectable()
export class BlockDiscoveryService implements OnModuleInit {
  private workspaces: InstanceWrapper<WorkspaceInterface>[] = [];
  private workflows: InstanceWrapper<WorkflowInterface>[] = [];

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit() {
    const providers = this.discovery.getProviders();

    this.workspaces = providers.filter((wrapper) => {
      const metatype = wrapper.metatype;
      if (!metatype) return false;
      return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, metatype) === 'workspace';
    }) as InstanceWrapper<WorkspaceInterface>[];

    this.workflows = providers.filter((wrapper) => {
      const metatype = wrapper.metatype;
      if (!metatype) return false;
      return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, metatype) === 'workflow';
    }) as InstanceWrapper<WorkflowInterface>[];
  }

  getWorkspaces(): WorkspaceInterface[] {
    return this.workspaces.map((wrapper) => wrapper.instance);
  }

  getWorkspace(name: string): WorkspaceInterface | undefined {
    const wrapper = this.workspaces.find((w) => w.name === name);
    return wrapper?.instance;
  }

  getWorkflowByName(name: string): WorkflowInterface | undefined {
    // Try class name first (exact match on provider name)
    const wrapper = this.workflows.find((w) => w.name === name);
    if (wrapper) {
      return wrapper.instance;
    }

    // Fallback: search by property name across all workspaces and workflows
    for (const ws of this.workspaces) {
      const workflow = getBlockWorkflow<WorkflowInterface>(ws.instance, name);
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
