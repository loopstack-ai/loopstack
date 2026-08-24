import { describe, expect, it } from 'vitest';
import { RemoteClientModule } from '@loopstack/remote-client';
import { type TestRun, coverage, replay, runWorkflow } from '@loopstack/testing';
import { FilesystemExamplesModule } from '../../../filesystem-examples.module';
import { RemoteFileExplorerExampleWorkflow } from '../remote-file-explorer-example.workflow';

/**
 * Infra-free testing of an infra-heavy workflow: the glob/read tools talk to a remote
 * workspace, but replaying their envelopes makes the whole flow hermetic — no server needed.
 * Two scripted results exercise both branches (matches found vs. none), showing how the tool
 * boundary drives branch coverage.
 */
describe('RemoteFileExplorerExampleWorkflow', () => {
  const runs: TestRun[] = [];
  const imports = [RemoteClientModule.forRoot(), FilesystemExamplesModule];

  it('reads the first match when markdown files exist', async () => {
    const run = await runWorkflow(RemoteFileExplorerExampleWorkflow, undefined, {
      imports,
      replay: replay({
        version: 3,
        recordings: [
          { tool: 'glob', envelope: { data: { files: ['docs/intro.md', 'docs/guide.md'] } } },
          { tool: 'read', envelope: { data: { content: '# Intro\n\nWelcome.', path: 'docs/intro.md' } } },
        ],
      }),
    });
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts.some((t) => t.includes('Found 2 markdown files'))).toBe(true);
    expect(texts.some((t) => t.includes('# docs/intro.md'))).toBe(true);
  });

  it('takes the empty branch when no markdown files are found', async () => {
    const run = await runWorkflow(RemoteFileExplorerExampleWorkflow, undefined, {
      imports,
      replay: replay({ version: 3, recordings: [{ tool: 'glob', envelope: { data: { files: [] } } }] }),
    });
    runs.push(run);

    expect(run.status).toBe('completed');
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('No markdown files to read.');
  });

  it('covers every transition (coverage gate)', () => {
    const cov = coverage(runs, RemoteFileExplorerExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
  });
});
