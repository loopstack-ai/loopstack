import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { BLOCK_TYPE_METADATA_KEY, WorkspaceInterface } from '@loopstack/common';

@Injectable()
export class BlockDiscoveryService implements OnModuleInit {
  private workspaces: InstanceWrapper<WorkspaceInterface>[] = [];

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit() {
    this.workspaces = this.discovery.getProviders().filter((wrapper) => {
      const metatype = wrapper.metatype;
      if (!metatype) return false;
      return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, metatype) === 'workspace';
    }) as InstanceWrapper<WorkspaceInterface>[];
  }

  getWorkspaces(): WorkspaceInterface[] {
    return this.workspaces.map((wrapper) => wrapper.instance);
  }

  getWorkspace(name: string): WorkspaceInterface | undefined {
    const wrapper = this.workspaces.find((w) => w.name === name);
    return wrapper?.instance;
  }
}
