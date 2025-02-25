import { Module } from '@nestjs/common';
import { SetContextTool } from './functions/set-context.tool';
import { ToolRegistry } from './registry/tool.registry';
import { DiscoveryModule } from '@nestjs/core';
import { ForwardChildContextTool } from './functions/forward-child-context.tool';
import { SetNamespaceTool } from './functions/set-namespace.tool';

@Module({
  imports: [DiscoveryModule],
  providers: [
    ToolRegistry,
    ForwardChildContextTool,
    SetContextTool,
    SetNamespaceTool,
  ],
  exports: [ToolRegistry],
})
export class ToolsModule {}
