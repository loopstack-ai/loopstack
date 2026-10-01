---
'@loopstack/local-file-explorer-module': patch
---

The `local-files/read` endpoint only returns files whose real location is inside the workspace root.
`FileSystemService.resolveContainedPath(basePath, relativePath)` resolves symlinks on both the root and the requested
path and returns the real path, or `null` when it lies outside the root or cannot be resolved; `FileApiService` reads
from that path and answers `Invalid file path` otherwise. Symlinks that stay inside the root are followed.
`validatePath` accepts names that start with two dots, such as `..notes.md`.
