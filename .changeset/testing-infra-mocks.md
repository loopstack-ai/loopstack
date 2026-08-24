---
'@loopstack/testing': minor
---

The hermetic test facade now boots infra-backed feature modules that previously crashed at DI time. Two generic fixes in the mock infrastructure: the mock `DataSource` carries an empty `entityMetadatas` list and a non-mongo `options.type`, so `@nestjs/typeorm`'s repository factory resolves a mock repository for any feature entity (`TypeOrmModule.forFeature([Entity])`) without a real connection; and a stubbed `WorkflowRunner` is provided globally, so feature modules whose controllers inject it (OAuth callbacks, scheduling webhooks/cron) can be constructed. Workflows that use git, remote-client, secrets, or sandbox tools can now be tested with ordinary `runWorkflow` + replay instead of per-tool fakes. The internal `MockDataSourceModule` is renamed `MockInfraModule` to reflect its wider role.
