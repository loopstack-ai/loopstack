import { describe, expect, it } from 'vitest';
import { WorkflowState } from '@loopstack/contracts/enums';
import { resolveInvalidations } from './invalidations.js';

const base = { userId: 'u1', workerId: 'w1' };
const ENV = 'local';

describe('resolveInvalidations', () => {
  it('workflow.created invalidates the parent child list only when parented', () => {
    expect(
      resolveInvalidations({ ...base, type: 'workflow.created', id: 'a', workflowId: 'a', parentId: 'p' }, ENV),
    ).toEqual([['childWorkflows', ENV, 'p']]);
    expect(resolveInvalidations({ ...base, type: 'workflow.created', id: 'a', workflowId: 'a' }, ENV)).toEqual([]);
  });

  it('workflow.updated invalidates the entity, its status, and the parent child list', () => {
    expect(
      resolveInvalidations(
        { ...base, type: 'workflow.updated', id: 'a', workflowId: 'a', parentId: 'p', status: WorkflowState.Running },
        ENV,
      ),
    ).toEqual([
      ['workflow', ENV, 'a'],
      ['workflowStatus', ENV, 'a'],
      ['childWorkflows', ENV, 'p'],
    ]);
  });

  it('document.created invalidates the workflow documents', () => {
    expect(resolveInvalidations({ ...base, type: 'document.created', workflowId: 'wf' }, ENV)).toEqual([
      ['documents', ENV, 'wf'],
    ]);
  });

  it('secret events invalidate workspace secrets', () => {
    for (const type of ['secret.upserted', 'secret.deleted'] as const) {
      expect(resolveInvalidations({ ...base, type, workspaceId: 'ws' }, ENV)).toEqual([['secrets', ENV, 'ws']]);
    }
  });

  it('git.updated invalidates all git keys', () => {
    expect(resolveInvalidations({ ...base, type: 'git.updated', workspaceId: 'ws' }, ENV)).toEqual([
      ['gitStatus', ENV, 'ws'],
      ['gitLog', ENV, 'ws'],
      ['gitRemote', ENV, 'ws'],
    ]);
  });

  it('llm and stream.reset events map to no cache keys', () => {
    expect(
      resolveInvalidations(
        { ...base, type: 'llm.response.text_delta', workflowId: 'wf', messageId: 'm', delta: 'x' },
        ENV,
      ),
    ).toEqual([]);
    expect(resolveInvalidations({ ...base, type: 'stream.reset' }, ENV)).toEqual([]);
  });
});
