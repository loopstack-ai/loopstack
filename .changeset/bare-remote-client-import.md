---
'@loopstack/remote-client': patch
---

Allow bare `RemoteClientModule` import without `forRoot()`. The module's static `@Module` decorator now wires a global root module, so importing the class directly registers `RemoteClient`, `EnvironmentService`, `EnvironmentConfigService`, `ENVIRONMENT_CONFIG`, and the file/exec tools with default config. `forRoot(options)` and `forFeature(options)` are unchanged.
