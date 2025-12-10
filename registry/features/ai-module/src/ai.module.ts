import { Module } from '@nestjs/common';
import { CoreFeaturesModule, LoopCoreModule } from '@loopstack/core';
import { AiProviderRegistryService } from './services/ai-provider-registry.service';
import { OpenAiProviderService } from './providers/openai.provider';
import { AnthropicProviderService } from './providers/anthropic.provider';
import { DiscoveryModule } from '@nestjs/core';
import { AiMessagesHelperService } from './services';
import { AiProviderModelHelperService } from './services';
import { AiToolsHelperService } from './services';
import { AiGenerateDocument, AiGenerateObject, AiGenerateText, DelegateToolCall } from './tools';
import { AiMessageDocument } from './documents';

@Module({
  imports: [
    LoopCoreModule,
    CoreFeaturesModule,
    DiscoveryModule,
  ],
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
  exports: [
    AiGenerateDocument,
    AiGenerateObject,
    AiGenerateText,
    DelegateToolCall,
    AiMessageDocument,
  ]
})
export class AiModule {}
