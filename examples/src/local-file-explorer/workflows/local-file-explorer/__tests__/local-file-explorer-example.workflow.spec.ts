import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalFileExplorerModule } from '@loopstack/local-file-explorer';
import { createWorkflowTest, runWorkflow } from '@loopstack/testing';
import { LocalFileExplorerExamplesModule } from '../../../local-file-explorer-examples.module';
import { LocalFileExplorerExampleWorkflow } from '../local-file-explorer-example.workflow';

/**
 * The workflow reads the real local disk through `FileSystemService` — no tool to mock. Pointing
 * `process.cwd()` at a scratch directory with known contents makes the rendered tree deterministic.
 */
describe('LocalFileExplorerExampleWorkflow', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'local-file-explorer-example-'));
    await mkdir(join(root, 'docs'));
    await writeFile(join(root, 'docs', 'guide.md'), '# Guide\n');
    await writeFile(join(root, 'README.md'), '# Readme\n');
    vi.spyOn(process, 'cwd').mockReturnValue(root);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it('boots on its own — no remote-client or sandbox infrastructure needed', async () => {
    const module = await createWorkflowTest().withImports(LocalFileExplorerExamplesModule).compile();
    expect(module.get(LocalFileExplorerExampleWorkflow)).toBeInstanceOf(LocalFileExplorerExampleWorkflow);
  });

  it('renders the workspace file tree built by FileSystemService', async () => {
    const run = await runWorkflow(LocalFileExplorerExampleWorkflow, undefined, {
      imports: [LocalFileExplorerModule],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    const markdown = (run.documents[0]?.content as { markdown?: string }).markdown ?? '';
    expect(markdown).toContain('# Workspace File Tree');
    expect(markdown).toContain(`Found 2 top-level entries in \`${root}\`.`);
    expect(markdown).toContain('- docs (folder)');
    expect(markdown).toContain('- README.md (file)');
  });
});
