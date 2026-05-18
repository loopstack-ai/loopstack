import { Global, Module } from '@nestjs/common';
import { LlmDelegateService } from './services/llm-delegate.service.js';
import { LlmProviderRegistry } from './services/llm-provider-registry.js';
import { LlmToolsHelperService } from './services/llm-tools-helper.service.js';
import { LlmDelegateToolCallsTool } from './tools/llm-delegate-tool-calls.tool.js';
import { LlmGenerateObjectTool } from './tools/llm-generate-object.tool.js';
import { LlmGenerateTextTool } from './tools/llm-generate-text.tool.js';
import { LlmUpdateToolResultTool } from './tools/llm-update-tool-result.tool.js';

@Global()
@Module({
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
