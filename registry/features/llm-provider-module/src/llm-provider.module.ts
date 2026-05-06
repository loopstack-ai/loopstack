import { Global, Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { LlmDelegateService } from './services/llm-delegate.service';
import { LlmProviderRegistry } from './services/llm-provider-registry';
import { LlmToolsHelperService } from './services/llm-tools-helper.service';
import { LlmDelegateToolCallsTool } from './tools/llm-delegate-tool-calls.tool';
import { LlmGenerateObjectTool } from './tools/llm-generate-object.tool';
import { LlmGenerateTextTool } from './tools/llm-generate-text.tool';
import { LlmUpdateToolResultTool } from './tools/llm-update-tool-result.tool';

@Global()
@Module({
  imports: [LoopCoreModule],
  providers: [
    LlmProviderRegistry,
    LlmToolsHelperService,
    LlmDelegateService,
    LlmGenerateTextTool,
    LlmGenerateObjectTool,
    LlmDelegateToolCallsTool,
    LlmUpdateToolResultTool,
  ],
  exports: [
    LlmProviderRegistry,
    LlmToolsHelperService,
    LlmDelegateService,
    LlmGenerateTextTool,
    LlmGenerateObjectTool,
    LlmDelegateToolCallsTool,
    LlmUpdateToolResultTool,
  ],
})
export class LlmProviderModule {}
