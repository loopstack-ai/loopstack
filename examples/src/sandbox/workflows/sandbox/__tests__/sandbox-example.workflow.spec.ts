import { describe, expect, it } from 'vitest';
import { SandboxToolModule } from '@loopstack/docker-sandbox';
import { SandboxFilesystemModule } from '@loopstack/docker-sandbox-filesystem';
import { coverage, createWorkflowTest, replay, runWorkflow } from '@loopstack/testing';
import { SandboxExamplesModule } from '../../../sandbox-examples.module';
import { SandboxExampleWorkflow } from '../sandbox-example.workflow';

/**
 * The sandbox tools drive a Docker container. Replaying their envelopes keeps the test
 * hermetic (no Docker daemon) while the workflow's lifecycle — init, file operations against
 * the container it created, destroy — runs for real.
 */
const CONTAINER_ID = 'my-sandbox';

const recordings = [
  { tool: 'sandbox_init', envelope: { data: { containerId: CONTAINER_ID, dockerId: 'docker-123' } } },
  { tool: 'sandbox_create_directory', envelope: { data: { path: '/workspace', created: true } } },
  { tool: 'sandbox_write_file', envelope: { data: { path: '/workspace/result.txt', bytesWritten: 19 } } },
  { tool: 'sandbox_read_file', envelope: { data: { content: 'Hello from sandbox!', encoding: 'utf8' } } },
  {
    tool: 'sandbox_list_directory',
    envelope: {
      data: {
        path: '/workspace',
        entries: [{ name: 'result.txt', type: 'file', size: 19, path: '/workspace/result.txt' }],
      },
    },
  },
  { tool: 'sandbox_exists', envelope: { data: { path: '/workspace/result.txt', exists: true, type: 'file' } } },
  {
    tool: 'sandbox_file_info',
    envelope: {
      data: {
        path: '/workspace/result.txt',
        name: 'result.txt',
        type: 'file',
        size: 19,
        permissions: '-rw-r--r--',
        owner: 'root',
        group: 'root',
        modifiedAt: '2026-01-01T00:00:00.000Z',
        accessedAt: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    },
  },
  { tool: 'sandbox_delete', envelope: { data: { path: '/workspace/result.txt', deleted: true } } },
  { tool: 'sandbox_destroy', envelope: { data: { containerId: CONTAINER_ID, removed: true } } },
];

describe('SandboxExampleWorkflow', () => {
  it('boots on its own — no remote-client or file-explorer infrastructure needed', async () => {
    const module = await createWorkflowTest().withImports(SandboxExamplesModule).compile();
    expect(module.get(SandboxExampleWorkflow)).toBeInstanceOf(SandboxExampleWorkflow);
  });

  it('runs the sandbox lifecycle: init, file operations in the container, destroy', async () => {
    const run = await runWorkflow(
      SandboxExampleWorkflow,
      { outputDir: '/tmp/out' },
      {
        imports: [SandboxToolModule, SandboxFilesystemModule],
        replay: replay({ version: 3, recordings }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.toolCalls.map((c) => c.toolName)).toEqual(recordings.map((r) => r.tool));

    // Every file operation and the teardown target the container the init call created.
    const [init, ...rest] = run.toolCalls;
    expect(init.args).toMatchObject({ containerId: CONTAINER_ID, projectOutPath: '/tmp/out' });
    for (const call of rest) {
      expect(call.args).toMatchObject({ containerId: CONTAINER_ID });
    }

    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts[0]).toContain('Sandbox initialized successfully');
    expect(texts.at(-1)).toContain(`Container ${CONTAINER_ID} removed=true`);

    expect(coverage([run], SandboxExampleWorkflow).missingTransitions).toEqual([]);
  });
});
