import { describe, expect, it } from 'vitest';
import { RemoteClientModule } from '@loopstack/remote-client';
import { replay, runWorkflow } from '@loopstack/testing';
import { RemoteClientExamplesModule } from '../../../remote-client-examples.module';
import { RemoteClientExampleWorkflow } from '../remote-client-example.workflow';

/**
 * The write/bash/read tools talk to a remote agent; replaying their envelopes makes the flow
 * hermetic. The assertion is the concept itself: a shell command runs on the remote machine
 * against the file the workflow just wrote there, and its output reaches the run.
 */
describe('RemoteClientExampleWorkflow', () => {
  it('writes a remote file, runs a shell command against it, and reads it back', async () => {
    const filePath = '/tmp/remote-client-example.txt';
    const run = await runWorkflow(RemoteClientExampleWorkflow, undefined, {
      imports: [RemoteClientModule.forRoot(), RemoteClientExamplesModule],
      replay: replay({
        version: 3,
        recordings: [
          { tool: 'write', envelope: { data: { success: true, path: filePath } } },
          {
            tool: 'bash',
            envelope: { data: { output: `1 ${filePath}\nThu Oct  1 12:00:00 UTC 2026\n`, exitCode: 0 } },
          },
          {
            tool: 'read',
            envelope: { data: { content: 'Hello from RemoteClientExampleWorkflow!\n', path: filePath } },
          },
        ],
      }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.toolCalls.map((c) => c.toolName)).toEqual(['write', 'bash', 'read']);
    expect(run.toolCalls[1].args).toMatchObject({ command: `wc -l ${filePath} && date` });

    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain(`Wrote file ${filePath}.`);
    expect(texts.some((t) => t.startsWith('Command output:') && t.includes(`1 ${filePath}`))).toBe(true);
    expect(texts.some((t) => t.includes('Hello from RemoteClientExampleWorkflow!'))).toBe(true);
  });
});
