import { describe, expect, it } from 'vitest';
import { RemoteClientModule } from '@loopstack/remote-client';
import { type TestRun, coverage, replay, runWorkflow } from '@loopstack/testing';
import { RemoteClientExamplesModule } from '../../../remote-client-examples.module';
import { FileSearchExampleWorkflow } from '../file-search-example.workflow';

/**
 * Infra-free testing of an infra-heavy workflow: the glob/grep/read tools talk to a remote
 * workspace, but replaying their envelopes makes the whole flow hermetic — no server needed.
 * Two scripted grep results exercise both branches (a match found vs. none), showing how the
 * tool boundary drives branch coverage.
 */
describe('FileSearchExampleWorkflow', () => {
  const runs: TestRun[] = [];
  const imports = [RemoteClientModule.forRoot(), RemoteClientExamplesModule];

  it('reads the first file that grep matches', async () => {
    const run = await runWorkflow(FileSearchExampleWorkflow, undefined, {
      imports,
      replay: replay({
        version: 3,
        recordings: [
          { tool: 'glob', envelope: { data: { files: ['docs/intro.md', 'docs/guide.md'] } } },
          {
            tool: 'grep',
            envelope: {
              data: {
                matches: [
                  { file: 'docs/guide.md', line: 12, content: '- TODO: add a diagram' },
                  { file: 'docs/intro.md', line: 3, content: 'TODO: write the intro' },
                ],
              },
            },
          },
          { tool: 'read', envelope: { data: { content: '# Guide\n\nSteps.', path: 'docs/guide.md' } } },
        ],
      }),
    });
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts.some((t) => t.includes('Found 2 markdown files'))).toBe(true);
    expect(texts.some((t) => t.includes('Found 2 lines with "TODO"'))).toBe(true);
    expect(texts.some((t) => t.includes('- docs/guide.md:12 - TODO: add a diagram'))).toBe(true);
    expect(texts.some((t) => t.startsWith('# docs/guide.md') && t.includes('Steps.'))).toBe(true);
  });

  it('takes the empty branch when grep finds no match', async () => {
    const run = await runWorkflow(FileSearchExampleWorkflow, undefined, {
      imports,
      replay: replay({
        version: 3,
        recordings: [
          { tool: 'glob', envelope: { data: { files: ['docs/intro.md'] } } },
          { tool: 'grep', envelope: { data: { matches: [] } } },
        ],
      }),
    });
    runs.push(run);

    expect(run.status).toBe('completed');
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('No file contains "TODO".');
  });

  it('covers every transition (coverage gate)', () => {
    const cov = coverage(runs, FileSearchExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
  });
});
