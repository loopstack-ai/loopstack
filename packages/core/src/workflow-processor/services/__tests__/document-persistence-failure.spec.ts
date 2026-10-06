import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentEntity } from '@loopstack/common';
import { type ExecutionScopeData, RunTraceCollector } from '../../utils/index.js';
import { DocumentPersistenceService } from '../document-persistence.service.js';

/**
 * What a failed write leaves behind for whoever reads the run afterwards. The constraint message a
 * rejected insert carries names the column and never the row, so the document has to be named here or
 * the only way back to it is reconstructing the transcript by hand.
 */
function persistingScope(): ExecutionScopeData {
  return {
    userId: 'u1',
    workspaceId: 'ws1',
    workflowId: 'wf1',
    workflowName: 'probe',
    labels: [],
    args: undefined,
    options: { stateless: false },
    cache: new Map(),
    queryRunner: null,
    documents: [],
    persistenceState: { documentsUpdated: false },
    trace: new RunTraceCollector(),
    tracePersist: false,
    transition: { id: 'stream', from: 'running', to: 'running', payload: {} },
    abortController: new AbortController(),
    stateDraft: {},
    resultDraft: {},
    resultDirty: false,
  };
}

describe('DocumentPersistenceService — a write the database rejects', () => {
  it('names the document, its key and the transition, then lets the error through', async () => {
    const scope = persistingScope();
    const repo = {
      create: (data: Partial<DocumentEntity>) => ({ ...data }) as DocumentEntity,
      save: () => Promise.reject(new Error('unsupported Unicode escape sequence')),
    };
    const service = new DocumentPersistenceService({ get: () => scope } as never, repo as never);
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(service.create('llm_message', class {}, {}, { key: 'tr_toolu_01Q7' })).rejects.toThrow(
      'unsupported Unicode escape sequence',
    );

    expect(logged).toHaveBeenCalledTimes(1);
    const message = String(logged.mock.calls[0][0]);
    expect(message).toContain('llm_message(key=tr_toolu_01Q7)');
    expect(message).toContain("transition 'stream'");
    expect(message).toContain('workflow wf1');
    expect(message).toContain('unsupported Unicode escape sequence');

    logged.mockRestore();
  });
});
