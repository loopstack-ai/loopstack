import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { ChangedFilesCard } from './ChangedFilesCard';

function document(content: Record<string, unknown>): DocumentItemInterface {
  return {
    id: 'doc-1',
    documentName: 'changed_files',
    index: 1,
    content,
    createdAt: '2026-10-01T08:00:00.000Z',
  } as unknown as DocumentItemInterface;
}

const wf = { id: 'wf-1' } as WorkflowFullInterface;

function renderCard(content: Record<string, unknown>) {
  return render(
    <ChangedFilesCard
      parentWorkflow={wf}
      workflow={wf}
      document={document(content)}
      isActive={true}
      isLastItem={true}
    />,
  );
}

describe('ChangedFilesCard', () => {
  const writeText = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it("renders the workflow's actions with `{path}` replaced by each node's host path", async () => {
    renderCard({
      hostRoot: '/home/me/my repo',
      paths: ['src/a.ts'],
      actions: [
        { label: "Copy 'zed' command", command: 'zed "{path}"' },
        { label: 'Open in VS Code', url: 'vscode://file{path}' },
      ],
    });

    const links = screen.getAllByTitle('Open in VS Code');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'vscode://file/home/me/my%20repo/src',
      'vscode://file/home/me/my%20repo/src/a.ts',
    ]);

    const [, fileCopy] = screen.getAllByTitle("Copy 'zed' command");
    fireEvent.click(fileCopy);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('zed "/home/me/my repo/src/a.ts"'));
  });

  it('renders the tree with no actions when the workflow names none', () => {
    renderCard({ hostRoot: '/home/me/repo', paths: ['src/a.ts'] });

    expect(screen.getByText('a.ts')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
