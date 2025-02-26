import { Module } from '@nestjs/common';
import { SetContextTool } from './functions/set-context.tool';
import { ToolRegistry } from './registry/tool.registry';
import { DiscoveryModule } from '@nestjs/core';
import { ForwardChildContextTool } from './functions/forward-child-context.tool';
import {SetCustomOptionTool} from "./functions/set-custom-option.tool";

@Module({
  imports: [DiscoveryModule],
  providers: [
    ToolRegistry,
    ForwardChildContextTool,
    SetContextTool,
    SetCustomOptionTool,
  ],
  exports: [ToolRegistry],
})
export class ToolsModule {}
