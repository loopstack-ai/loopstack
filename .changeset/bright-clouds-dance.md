---
'@loopstack/core': minor
'@loopstack/common': minor
'@loopstack/api': minor
'@loopstack/contracts': patch
'@loopstack/loopstack-studio': minor
'@loopstack/testing': patch
---

Add secrets management system and consolidate document types into core

- New SecretEntity, SecretService, and SecretController with full CRUD API
- Move built-in document types (error, link, markdown, message, plain) from core-ui-module into core
- Add SecretRequestDocument and RequestSecretsTool for workflow-driven secret collection
- Add CreateDocument tool for dynamic document creation in workflows
- Add secrets management panel and SecretInput widget to Studio
- Refactor ToolResult.effects to array and add ToolCallEntry/ToolCallsMap interfaces
- Simplify UiElementSchema in contracts
