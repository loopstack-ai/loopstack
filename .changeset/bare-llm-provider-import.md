---
'@loopstack/llm-provider-module': patch
---

Allow bare `LlmProviderModule` import without `forRoot({})`. The module's static `@Module` decorator now wires the global root, so importing the class directly registers the provider registry, helper services, and tools with default config. `forRoot(config)` and `forFeature(config)` are unchanged.
