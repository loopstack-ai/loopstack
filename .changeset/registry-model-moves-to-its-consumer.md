---
'@loopstack/contracts': minor
---

Drop the registry entry enums from `@loopstack/contracts/enums`.

`RegistryEntryStatus`, `RegistryEntryCategory`, `RegistryCategory` and `REGISTRY_CATEGORIES` describe the
package registry that loopstack.ai runs, not anything the framework itself understands: no package in this
repository reads them, and nothing in the workflow engine branches on whether an entry is pending or which
category it sits in. A contract is the vocabulary two sides have to agree on, so a registry's own data model
belongs to the application that stores and serves it, which is free to grow a status or a category without
that being a release of the framework.
