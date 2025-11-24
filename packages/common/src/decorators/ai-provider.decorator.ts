import { Injectable, SetMetadata } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';

export const AI_PROVIDER_DECORATOR = 'AI_PROVIDER_DECORATOR';

export interface AiProviderDecoratorOptions {
  name: string;
}

export function AiProvider(options: AiProviderDecoratorOptions): ClassDecorator {
  return applyDecorators(
    Injectable(),
    SetMetadata(AI_PROVIDER_DECORATOR, options),
  );
}