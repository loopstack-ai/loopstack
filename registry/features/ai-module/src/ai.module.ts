import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { AiMessageDocument } from './documents';
import { AnthropicProviderService } from './providers/anthropic.provider';
import { OpenAiProviderService } from './providers/openai.provider';
import { AiMessagesHelperService } from './services';
import { AiProviderModelHelperService } from './services';
import { AiToolsHelperService } from './services';
import { AiProviderRegistryService } from './services/ai-provider-registry.service';
import { AiGenerateDocument, AiGenerateObject, AiGenerateText, DelegateToolCall } from './tools';

@Module({
  imports: [CoreUiModule, DiscoveryModule],
  providers: [
    // services
    AiMessagesHelperService,
    AiProviderModelHelperService,
    AiToolsHelperService,
    AiProviderRegistryService,

    // ai providers
    OpenAiProviderService,
    AnthropicProviderService,

    // tools
    AiGenerateDocument,
    AiGenerateObject,
    AiGenerateText,
    DelegateToolCall,

    // documents
    AiMessageDocument,
  ],
  exports: [AiGenerateDocument, AiGenerateObject, AiGenerateText, DelegateToolCall, AiMessageDocument],
})
export class AiModule {}
