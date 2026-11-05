import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StudioDocumentConfig, WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { createStudioTestClient, createStudioWrapper } from '@/test-utils/loopstack.tsx';
import { TerminalHandoffCard } from './TerminalHandoffCard';

const TRANSITION = 'handoffDone';
const COMMAND = 'docker exec -it -w /workspace abc123 bash';

const documentConfig = {
  documentName: 'terminal_handoff',
  ui: { widgets: [{ widget: 'terminal-handoff', options: { transition: TRANSITION } }] },
} as unknown as StudioDocumentConfig;

function document(content: Record<string, unknown> = { command: COMMAND, cwd: '/workspace' }): DocumentItemInterface {
  return {
    id: 'doc-1',
    documentName: 'terminal_handoff',
    index: 1,
    content,
    createdAt: '2026-10-01T08:00:00.000Z',
  } as unknown as DocumentItemInterface;
}

const parentWorkflow = { id: 'wf-parent' } as WorkflowFullInterface;

function workflow(availableTransitions: string[]): WorkflowFullInterface {
  return {
    id: 'wf-attach',
    availableTransitions: availableTransitions.map((id) => ({ id })),
  } as unknown as WorkflowFullInterface;
}

function renderCard(availableTransitions = [TRANSITION], content?: Record<string, unknown>) {
  const { client, processor } = createStudioTestClient([documentConfig]);
  const { wrapper: Wrapper } = createStudioWrapper(client);
  const view = render(
    <TerminalHandoffCard
      parentWorkflow={parentWorkflow}
      workflow={workflow(availableTransitions)}
      document={document(content)}
      isActive={true}
      isLastItem={true}
    />,
    { wrapper: Wrapper },
  );
  return { ...view, processor };
}

const continueButton = () => screen.getByRole('button', { name: /continue the run/i });

describe('TerminalHandoffCard', () => {
  it('shows the command and offers to continue the run while the transition is available', async () => {
    renderCard();

    expect(screen.getByText(COMMAND)).toBeInTheDocument();
    expect(screen.getByText('Run in a terminal')).toBeInTheDocument();
    await waitFor(() => expect(continueButton()).toBeEnabled());
  });

  it("shows the workflow's own title and description", () => {
    renderCard([TRANSITION], { command: COMMAND, title: 'Interactive session', description: 'Resume the session.' });

    expect(screen.getByText('Interactive session')).toBeInTheDocument();
    expect(screen.getByText('Resume the session.')).toBeInTheDocument();
    expect(screen.queryByText('Run in a terminal')).not.toBeInTheDocument();
  });

  it("fires the document's transition with an empty payload when continued by hand", async () => {
    const { container, processor } = renderCard();

    await waitFor(() => expect(continueButton()).toBeEnabled());
    fireEvent.click(continueButton());

    await waitFor(() =>
      expect(processor.run).toHaveBeenCalledWith('wf-parent', {
        transition: { id: TRANSITION, workflowId: 'wf-attach', payload: {} },
      }),
    );
    // Queued is not applied: the button stays busy until the run leaves the waiting place.
    expect(continueButton()).toBeDisabled();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('offers no button when the run waits on a transition the document does not declare', () => {
    renderCard(['release']);

    expect(screen.queryByRole('button', { name: /continue the run/i })).not.toBeInTheDocument();
  });

  it('reads as done once the run no longer offers the transition', () => {
    renderCard([]);

    expect(screen.getByText(COMMAND)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue the run/i })).not.toBeInTheDocument();
    expect(screen.getByText('Done.')).toBeInTheDocument();
  });
});
