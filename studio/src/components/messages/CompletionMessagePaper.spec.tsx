import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioDocumentConfig } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import MarkdownMessageRenderer from '@/features/documents/renderers/MarkdownMessageRenderer.tsx';
import { createStudioTestClient, createStudioWrapper } from '@/test-utils/loopstack.tsx';
import CompletionMessagePaper from './CompletionMessagePaper.tsx';

const documentConfig = {
  documentName: 'summary',
  ui: { widgets: [{ widget: 'markdown' }] },
} as unknown as StudioDocumentConfig;

const document = {
  id: 'doc-1',
  documentName: 'summary',
  index: 3,
  place: 'reviewing',
  transition: 'summarize',
  labels: ['draft'],
  tags: [],
  isInvalidated: false,
  validationError: null,
  meta: null,
  content: { markdown: '## Result\n\nAll checks passed.' },
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:05:00.000Z',
  workflowId: 'wf-1',
  workspaceId: 'ws-1',
} as DocumentItemInterface;

const writeText = vi.fn(async () => undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

function renderWithProviders(ui: React.ReactElement) {
  const { client } = createStudioTestClient([documentConfig]);
  const { wrapper: Wrapper } = createStudioWrapper(client);
  return render(ui, { wrapper: Wrapper });
}

describe('CompletionMessagePaper', () => {
  it('shows no role label or time above the box', () => {
    renderWithProviders(
      <CompletionMessagePaper document={document} role="assistant">
        Hello
      </CompletionMessagePaper>,
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.queryByText(/assistant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{1,2}:\d{2}/)).not.toBeInTheDocument();
  });

  it('copies the text the renderer passes in', async () => {
    renderWithProviders(<MarkdownMessageRenderer document={document} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy content' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('## Result\n\nAll checks passed.'));
  });

  it('copies the content as JSON when the renderer passes no text', async () => {
    renderWithProviders(<CompletionMessagePaper document={document}>Form</CompletionMessagePaper>);

    fireEvent.click(screen.getByRole('button', { name: 'Copy content' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(JSON.stringify(document.content, null, 2)));
  });

  it('opens the document metadata from the details icon', async () => {
    renderWithProviders(
      <CompletionMessagePaper document={document} role="assistant">
        Hello
      </CompletionMessagePaper>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Document details' }));

    expect(await screen.findByText('markdown')).toBeInTheDocument();
    expect(screen.getByText('summary')).toBeInTheDocument();
    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.getByText('reviewing')).toBeInTheDocument();
    expect(screen.getByText('summarize')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText(new Date(document.createdAt).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText('doc-1')).toBeInTheDocument();
    expect(screen.getByText('wf-1')).toBeInTheDocument();
    expect(screen.getByText('ws-1')).toBeInTheDocument();
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });
});
