import { describe, expect, it } from 'vitest';
import { GitModule } from '@loopstack/git-module';
import { RemoteClientModule } from '@loopstack/remote-client';
import { replay, runWorkflow } from '@loopstack/testing';
import { GitExamplesModule } from '../../../git-examples.module';
import { GitCommitFlowExampleWorkflow } from '../git-commit-flow-example.workflow';

/**
 * A scripted multi-tool pipeline with no LLM. The git and write tools are HTTP-backed (they
 * talk to a remote workspace), so the whole flow runs against the tool boundary: each tool's
 * response is replayed in call order, and the workflow's own state threading and document
 * rendering run for real. Envelopes match each tool's `resultSchema`.
 *
 * `RemoteClientModule.forRoot()` establishes the global remote-client services the git tools
 * depend on; the tools' actual network calls are replaced by the replay script.
 */
describe('GitCommitFlowExampleWorkflow', () => {
  it('writes a file, then stages, commits, and reads back the log', async () => {
    const run = await runWorkflow(GitCommitFlowExampleWorkflow, undefined, {
      imports: [
        RemoteClientModule.forRoot(),
        GitModule.forFeature(),
        RemoteClientModule.forFeature({ slots: [{ id: 'sandbox', type: 'sandbox', title: 'Sandbox' }] }),
        GitExamplesModule,
      ],
      replay: replay({
        version: 3,
        recordings: [
          { tool: 'write', envelope: { data: { success: true, path: 'tmp/example.txt' } } },
          {
            tool: 'git_status',
            envelope: {
              data: { branch: 'main', staged: [], modified: [], untracked: ['tmp/example.txt'], deleted: [] },
            },
          },
          { tool: 'git_add', envelope: { data: { success: true } } },
          { tool: 'git_commit', envelope: { data: { hash: 'abc123', message: 'chore: example commit' } } },
          {
            tool: 'git_log',
            envelope: {
              data: {
                commits: [
                  {
                    hash: 'abc123',
                    shortHash: 'abc123',
                    message: 'chore: example commit',
                    author: 'Test',
                    date: '2026-01-01',
                  },
                ],
              },
            },
          },
        ],
      }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['writeTestFile', 'checkStatus', 'stageAll', 'commit', 'readBack']);

    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts.some((t) => t.includes('"branch": "main"'))).toBe(true);
    expect(texts.some((t) => t.includes('chore: example commit'))).toBe(true);
  });
});
