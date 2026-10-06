---
'@loopstack/common': minor
---

Remove the `@AiProvider` and `@CapabilityFactory` decorators, their `AI_PROVIDER_DECORATOR` and
`FACTORY_MODULE` metadata keys, and the `AiProviderDecoratorOptions`, `AiProviderInterface` and
`AiProviderOptions` types from `@loopstack/common`.

Nothing reads the metadata these decorators write, so a class decorated with them was never discovered or
registered. An LLM provider is a plain `@Injectable()` class that implements `LlmProviderInterface` from
`@loopstack/llm-provider-module` and registers itself with `LlmProviderRegistry` in `onModuleInit`:

```ts
@Injectable()
export class MyLlmProvider implements LlmProviderInterface<MyProviderConfig>, OnModuleInit {
  readonly providerId = 'my-provider';

  constructor(private readonly registry: LlmProviderRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  // generateText / generateObject …
}
```
