import { describe, expect, it } from 'vitest';
import { WorkflowState } from '../enums/workflow-state.enum.js';
import { BatchDeleteSchema, SortBySchema } from './common.schema.js';
import { DocumentFilterSchema, DocumentItemSchema } from './document.schema.js';
import { createPaginatedSchema } from './pagination.schema.js';
import {
  RunWorkflowPayloadSchema,
  StartWorkflowPayloadSchema,
  WorkflowCreateSchema,
  WorkflowFilterSchema,
  WorkflowItemSchema,
  WorkflowUpdateSchema,
} from './workflow.schema.js';

const UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('WorkflowCreateSchema', () => {
  const valid = { workflowName: 'hello', workspaceId: UUID };

  it('accepts a minimal payload', () => {
    expect(WorkflowCreateSchema.parse(valid)).toEqual(valid);
  });

  it('strips unknown keys', () => {
    expect(WorkflowCreateSchema.parse({ ...valid, evil: true })).not.toHaveProperty('evil');
  });

  it('rejects a missing or empty workflowName', () => {
    expect(WorkflowCreateSchema.safeParse({ workspaceId: UUID }).success).toBe(false);
    expect(WorkflowCreateSchema.safeParse({ ...valid, workflowName: '' }).success).toBe(false);
  });

  it('rejects an overlong workflowName and title', () => {
    expect(WorkflowCreateSchema.safeParse({ ...valid, workflowName: 'x'.repeat(101) }).success).toBe(false);
    expect(WorkflowCreateSchema.safeParse({ ...valid, title: 'x'.repeat(201) }).success).toBe(false);
  });

  it('rejects a non-uuid workspaceId', () => {
    expect(WorkflowCreateSchema.safeParse({ ...valid, workspaceId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects empty or non-string labels', () => {
    expect(WorkflowCreateSchema.safeParse({ ...valid, labels: [] }).success).toBe(false);
    expect(WorkflowCreateSchema.safeParse({ ...valid, labels: [42] }).success).toBe(false);
  });

  it('accepts a null title and transition', () => {
    expect(WorkflowCreateSchema.safeParse({ ...valid, title: null, transition: null }).success).toBe(true);
  });
});

describe('WorkflowUpdateSchema', () => {
  it('accepts partial updates and rejects empty labels', () => {
    expect(WorkflowUpdateSchema.safeParse({ title: 'New title' }).success).toBe(true);
    expect(WorkflowUpdateSchema.safeParse({}).success).toBe(true);
    expect(WorkflowUpdateSchema.safeParse({ labels: [] }).success).toBe(false);
    expect(WorkflowUpdateSchema.safeParse({ title: 'x'.repeat(201) }).success).toBe(false);
  });
});

describe('WorkflowFilterSchema', () => {
  it('validates uuids and allows a null parentId', () => {
    expect(WorkflowFilterSchema.safeParse({ workspaceId: UUID, parentId: null }).success).toBe(true);
    expect(WorkflowFilterSchema.safeParse({ workspaceId: 'nope' }).success).toBe(false);
    expect(WorkflowFilterSchema.safeParse({ parentId: 'nope' }).success).toBe(false);
  });
});

describe('SortBySchema', () => {
  it('requires a field and a valid order', () => {
    expect(SortBySchema.safeParse({ field: 'createdAt', order: 'DESC' }).success).toBe(true);
    expect(SortBySchema.safeParse({ field: '', order: 'DESC' }).success).toBe(false);
    expect(SortBySchema.safeParse({ field: 'createdAt', order: 'sideways' }).success).toBe(false);
  });
});

describe('BatchDeleteSchema', () => {
  it('bounds the ids array and requires uuids', () => {
    expect(BatchDeleteSchema.safeParse({ ids: [UUID] }).success).toBe(true);
    expect(BatchDeleteSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(BatchDeleteSchema.safeParse({ ids: ['nope'] }).success).toBe(false);
    expect(BatchDeleteSchema.safeParse({ ids: Array(101).fill(UUID) }).success).toBe(false);
  });
});

describe('StartWorkflowPayloadSchema', () => {
  it('requires workflowName and workspaceId', () => {
    expect(StartWorkflowPayloadSchema.safeParse({ workflowName: 'hello', workspaceId: 'ws' }).success).toBe(true);
    expect(StartWorkflowPayloadSchema.safeParse({ workflowName: 'hello' }).success).toBe(false);
    expect(StartWorkflowPayloadSchema.safeParse({ workspaceId: 'ws' }).success).toBe(false);
  });
});

describe('RunWorkflowPayloadSchema', () => {
  it('accepts an empty payload and validates nested transitions', () => {
    expect(RunWorkflowPayloadSchema.safeParse({}).success).toBe(true);
    expect(
      RunWorkflowPayloadSchema.safeParse({ transition: { id: 't1', workflowId: 'wf-1', payload: { ok: true } } })
        .success,
    ).toBe(true);
    expect(RunWorkflowPayloadSchema.safeParse({ transition: { payload: {} } }).success).toBe(false);
  });
});

describe('response schemas', () => {
  const workflowItem = {
    id: UUID,
    workflowName: 'hello',
    title: 'Hello',
    run: 1,
    labels: [],
    status: WorkflowState.Running,
    hasError: false,
    place: 'start',
    createdAt: '2026-07-03T10:00:00.000Z',
    updatedAt: '2026-07-03T10:00:00.000Z',
    workspaceId: UUID,
    parentId: null,
    hasChildren: 0,
  };

  it('parses a workflow item and rejects non-ISO dates', () => {
    expect(WorkflowItemSchema.parse(workflowItem)).toEqual(workflowItem);
    expect(WorkflowItemSchema.safeParse({ ...workflowItem, createdAt: 'yesterday' }).success).toBe(false);
  });

  it('parses a document item', () => {
    const documentItem = {
      id: UUID,
      documentName: 'llm_message',
      content: { role: 'assistant', text: 'hi' },
      validationError: null,
      meta: null,
      isInvalidated: false,
      index: 0,
      transition: null,
      place: 'start',
      labels: [],
      tags: ['message'],
      createdAt: '2026-07-03T10:00:00.000Z',
      updatedAt: '2026-07-03T10:00:00.000Z',
      workspaceId: UUID,
      workflowId: UUID,
    };
    expect(DocumentItemSchema.parse(documentItem)).toEqual(documentItem);
  });

  it('builds paginated schemas', () => {
    const schema = createPaginatedSchema(WorkflowItemSchema);
    expect(schema.safeParse({ data: [workflowItem], total: 1, page: 1, limit: 100 }).success).toBe(true);
    expect(schema.safeParse({ data: [{ nope: true }], total: 1, page: 1, limit: 100 }).success).toBe(false);
  });
});

describe('DocumentFilterSchema', () => {
  it('validates the workflowId', () => {
    expect(DocumentFilterSchema.safeParse({ workflowId: UUID }).success).toBe(true);
    expect(DocumentFilterSchema.safeParse({ workflowId: 'nope' }).success).toBe(false);
  });
});
