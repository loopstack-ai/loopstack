import { Module } from '@nestjs/common';
import { SetContextTool } from './functions/set-context.tool';
import { ToolRegistry } from './registry/tool.registry';
import { DiscoveryModule } from '@nestjs/core';
import { ForwardChildContextTool } from './functions/forward-child-context.tool';
import { SetCustomOptionTool } from './functions/set-custom-option.tool';
import {PersistenceModule} from "../persistence/persistence.module";
import {AddNamespaceTool} from "./functions/add-namespace.tool";

@Module({
  imports: [
    DiscoveryModule,
    PersistenceModule,
  ],
  providers: [
    ToolRegistry,
    ForwardChildContextTool,
    SetContextTool,
    SetCustomOptionTool,
    AddNamespaceTool,
  ],
  exports: [ToolRegistry],
})
export class ToolsModule {}
