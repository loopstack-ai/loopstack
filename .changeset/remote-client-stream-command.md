---
"@loopstack/remote-client": minor
---

Streamed command execution over `RemoteClient`

Long-running remote commands (clone / install / build / app start) can now stream their output live
instead of blocking until they finish:

- `RemoteClient.startExec` / `execStatus` / `readExecLog` / `killExec` are low-level primitives over the
  remote's append-only, offset-polled command log.
- `RemoteClient.streamCommand(url, { command, onChunk, signal, timeout, pollMs })` drives the poll loop:
  it hands each new slice of merged stdout+stderr to `onChunk` as it arrives and resolves with the exit
  code and full output. Aborting `signal` kills the remote command; a timed-out command resolves with
  exit code `124`.

The `bash` tool now streams its output live into a document as the command runs. Its result shape is
merged accordingly: `{ output, exitCode }` (previously `{ stdout, stderr, exitCode }`) — a single
chronological stream, which is how a terminal reads.
