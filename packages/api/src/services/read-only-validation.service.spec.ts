import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { StudioDiscoveryService } from '@loopstack/core';
import type { DocumentApiService } from './document-api.service.js';
import { ReadOnlyValidationService } from './read-only-validation.service.js';

interface FakeDocumentConfig {
  documentName: string;
  ui?: unknown;
  schema?: unknown;
  meta?: unknown;
}

interface FakeDocument {
  documentName: string;
  content: Record<string, unknown> | null;
  place: string;
}

const FEEDBACK_CONFIG: FakeDocumentConfig = {
  documentName: 'feedback_form',
  ui: {
    widgets: [
      {
        widget: 'form',
        options: {
          properties: {
            subject: { title: 'Subject', readonly: true },
            comment: { widget: 'textarea' },
          },
          actions: [{ type: 'button', transition: 'submitFeedback', label: 'Submit' }],
        },
      },
    ],
  },
  schema: {
    type: 'object',
    properties: { subject: { type: 'string' }, rating: { type: 'number' }, comment: { type: 'string' } },
  },
};

function service(configs: FakeDocumentConfig[], documents: FakeDocument[]) {
  const discovery = {
    getApps: () => [{ documents: configs }],
  } as unknown as StudioDiscoveryService;
  const documentApi = {
    findAll: vi.fn((_user: string, filter: { place?: string }) =>
      Promise.resolve({
        data: documents.filter((document) => filter.place === undefined || document.place === filter.place),
        total: documents.length,
        page: 0,
        limit: 100,
      }),
    ),
  } as unknown as DocumentApiService;
  return { validator: new ReadOnlyValidationService(discovery, documentApi), documentApi };
}

const WORKFLOW = { id: 'wf-1', place: 'waiting_for_feedback' };

const feedbackDoc = (content: Record<string, unknown>, place = 'waiting_for_feedback'): FakeDocument => ({
  documentName: 'feedback_form',
  content,
  place,
});

describe('ReadOnlyValidationService', () => {
  it('rejects a payload changing a read-only field', async () => {
    const { validator } = service([FEEDBACK_CONFIG], [feedbackDoc({ subject: 'CLI', rating: 3, comment: '' })]);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submitFeedback', {
        subject: 'Something else',
        rating: 5,
        comment: 'great',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submitFeedback', { subject: 'X' }),
    ).rejects.toThrow('Field "subject" of document "feedback_form" is read-only.');
  });

  it('accepts a payload keeping the read-only field unchanged', async () => {
    const { validator } = service([FEEDBACK_CONFIG], [feedbackDoc({ subject: 'CLI', rating: 3, comment: '' })]);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submitFeedback', {
        subject: 'CLI',
        rating: 5,
        comment: 'great',
      }),
    ).resolves.toBeUndefined();
  });

  it('accepts a payload omitting the read-only field', async () => {
    const { validator } = service([FEEDBACK_CONFIG], [feedbackDoc({ subject: 'CLI', rating: 3, comment: '' })]);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submitFeedback', { rating: 1 }),
    ).resolves.toBeUndefined();
  });

  it('accepts changes to fields that are not read-only', async () => {
    const { validator } = service([FEEDBACK_CONFIG], [feedbackDoc({ subject: 'CLI', rating: 3, comment: 'old' })]);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submitFeedback', {
        subject: 'CLI',
        rating: 1,
        comment: 'entirely new',
      }),
    ).resolves.toBeUndefined();
  });

  it('compares structurally — deep-equal objects pass, changed nested values reject', async () => {
    const config: FakeDocumentConfig = {
      documentName: 'nested_form',
      ui: {
        widgets: [
          {
            widget: 'form',
            options: {
              properties: { meta: { readonly: true } },
              actions: [{ transition: 'submit' }],
            },
          },
        ],
      },
    };
    const doc: FakeDocument = {
      documentName: 'nested_form',
      content: { meta: { tags: ['a', 'b'], count: 2 } },
      place: 'waiting_for_feedback',
    };
    const { validator } = service([config], [doc]);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submit', {
        meta: { tags: ['a', 'b'], count: 2 },
      }),
    ).resolves.toBeUndefined();
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submit', {
        meta: { tags: ['a', 'CHANGED'], count: 2 },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('skips entirely when the transition is not declared by any widget', async () => {
    const { validator, documentApi } = service(
      [FEEDBACK_CONFIG],
      [feedbackDoc({ subject: 'CLI', rating: 3, comment: '' })],
    );
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'userMessage', { subject: 'irrelevant' }),
    ).resolves.toBeUndefined();
    expect(documentApi.findAll).not.toHaveBeenCalled();
  });

  it('ignores documents parked at a different place (Studio isDocumentActive)', async () => {
    const { validator } = service(
      [FEEDBACK_CONFIG],
      [feedbackDoc({ subject: 'CLI', rating: 3, comment: '' }, 'some_earlier_place')],
    );
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submitFeedback', { subject: 'changed' }),
    ).resolves.toBeUndefined();
  });

  it('honors meta.enableAtPlaces for documents active beyond their save place', async () => {
    const config: FakeDocumentConfig = { ...FEEDBACK_CONFIG, meta: { enableAtPlaces: ['waiting_for_feedback'] } };
    const { validator } = service(
      [config],
      [feedbackDoc({ subject: 'CLI', rating: 3, comment: '' }, 'some_earlier_place')],
    );
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submitFeedback', { subject: 'changed' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('enforces via widget options.transition as well as actions[].transition', async () => {
    const config: FakeDocumentConfig = {
      documentName: 'secretish',
      ui: {
        widgets: [
          { widget: 'custom', options: { transition: 'confirmIt', properties: { token: { readonly: true } } } },
        ],
      },
    };
    const doc: FakeDocument = {
      documentName: 'secretish',
      content: { token: 'abc' },
      place: 'waiting_for_feedback',
    };
    const { validator } = service([config], [doc]);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'confirmIt', { token: 'xyz' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to schema-level readonly when the widget config declares none (Studio parity)', async () => {
    const config: FakeDocumentConfig = {
      documentName: 'schema_marked',
      ui: { widgets: [{ widget: 'form', options: { actions: [{ transition: 'submit' }] } }] },
      schema: { type: 'object', properties: { locked: { type: 'string', readonly: true }, open: { type: 'string' } } },
    };
    const doc: FakeDocument = {
      documentName: 'schema_marked',
      content: { locked: 'v1', open: 'x' },
      place: 'waiting_for_feedback',
    };
    const { validator } = service([config], [doc]);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submit', { locked: 'v2' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submit', { locked: 'v1', open: 'y' }),
    ).resolves.toBeUndefined();
  });

  it('lets widget config override schema readonly per field (ui wins)', async () => {
    const config: FakeDocumentConfig = {
      documentName: 'override',
      ui: {
        widgets: [
          {
            widget: 'form',
            options: { properties: { locked: { readonly: false } }, actions: [{ transition: 'submit' }] },
          },
        ],
      },
      schema: { type: 'object', properties: { locked: { type: 'string', readonly: true } } },
    };
    const doc: FakeDocument = { documentName: 'override', content: { locked: 'v1' }, place: 'waiting_for_feedback' };
    const { validator } = service([config], [doc]);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submit', { locked: 'v2' }),
    ).resolves.toBeUndefined();
  });

  it('does nothing when no config marks read-only fields (fast path, no document query)', async () => {
    const plain: FakeDocumentConfig = {
      documentName: 'plain_form',
      ui: { widgets: [{ widget: 'form', options: { actions: [{ transition: 'submit' }] } }] },
    };
    const { validator, documentApi } = service([plain], []);
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submit', { anything: 'goes' }),
    ).resolves.toBeUndefined();
    expect(documentApi.findAll).not.toHaveBeenCalled();
  });

  it('checks every active matching document', async () => {
    const { validator } = service(
      [FEEDBACK_CONFIG],
      [
        feedbackDoc({ subject: 'first', rating: 1, comment: '' }),
        feedbackDoc({ subject: 'second', rating: 2, comment: '' }),
      ],
    );
    // Payload matches the first document's subject but not the second's.
    await expect(
      validator.assertPayloadRespectsReadOnly('user-1', WORKFLOW, 'submitFeedback', { subject: 'first' }),
    ).rejects.toThrow(BadRequestException);
  });
});
